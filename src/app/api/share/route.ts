import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { SharedChat, Message } from '@/types';

const DATA_DIR = join(process.cwd(), 'data');
const SHARED_CHATS_FILE = join(DATA_DIR, 'shared-chats.json');

// In-memory cache
let sharedChatsCache: Map<string, SharedChat> = new Map();
let isCacheLoaded = false;

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Load shared chats from file
async function loadSharedChats(): Promise<Map<string, SharedChat>> {
    if (isCacheLoaded) return sharedChatsCache;

    try {
        await ensureDataDir();
        const data = await fs.readFile(SHARED_CHATS_FILE, 'utf-8');
        const chats: SharedChat[] = JSON.parse(data);
        const now = new Date().toISOString();

        // Filter out expired chats
        const validChats = chats.filter(chat => !chat.expiresAt || chat.expiresAt > now);

        sharedChatsCache = new Map(validChats.map(chat => [chat.id, chat]));
        isCacheLoaded = true;

        // Save back if some were filtered out
        if (validChats.length !== chats.length) {
            await saveSharedChats();
        }
    } catch {
        sharedChatsCache = new Map();
        isCacheLoaded = true;
    }

    return sharedChatsCache;
}

// Save shared chats to file
async function saveSharedChats() {
    await ensureDataDir();
    const chats = Array.from(sharedChatsCache.values());
    await fs.writeFile(SHARED_CHATS_FILE, JSON.stringify(chats, null, 2));
}

// Generate a short unique ID
function generateShareId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 10; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// POST - Create a new shared chat
export async function POST(req: Request) {
    try {
        const { title, messages, expiresInDays = 30 } = await req.json();

        if (!title || !messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Title and messages are required' },
                { status: 400 }
            );
        }

        // Get base URL from request headers (works on Vercel automatically)
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;

        // Filter out sensitive data from messages (exclude reasoning)
        const sanitizedMessages = messages.map((msg: Message) => ({
            role: msg.role,
            content: msg.content,
            // reasoning is intentionally excluded for shared chats
        }));

        const now = new Date();
        const shareId = generateShareId();

        const sharedChat: SharedChat = {
            id: shareId,
            title: title.slice(0, 100),
            messages: sanitizedMessages,
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
            viewCount: 0,
        };

        await loadSharedChats();
        sharedChatsCache.set(shareId, sharedChat);
        await saveSharedChats();

        return NextResponse.json({
            success: true,
            shareId,
            shareUrl: `${baseUrl}/share/${shareId}`,
            expiresAt: sharedChat.expiresAt,
        });
    } catch (error: any) {
        console.error('[Share] Error creating shared chat:', error);
        return NextResponse.json(
            { error: 'Failed to create shared chat' },
            { status: 500 }
        );
    }
}

// GET - Retrieve a shared chat
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const shareId = searchParams.get('id');

        if (!shareId) {
            return NextResponse.json(
                { error: 'Share ID is required' },
                { status: 400 }
            );
        }

        await loadSharedChats();
        const chat = sharedChatsCache.get(shareId);

        if (!chat) {
            return NextResponse.json(
                { error: 'Shared chat not found or expired' },
                { status: 404 }
            );
        }

        // Check if expired
        if (chat.expiresAt && new Date(chat.expiresAt) < new Date()) {
            sharedChatsCache.delete(shareId);
            await saveSharedChats();
            return NextResponse.json(
                { error: 'Shared chat has expired' },
                { status: 404 }
            );
        }

        // Increment view count
        chat.viewCount++;
        await saveSharedChats();

        return NextResponse.json({
            success: true,
            chat: {
                id: chat.id,
                title: chat.title,
                messages: chat.messages,
                createdAt: chat.createdAt,
                viewCount: chat.viewCount,
            },
        });
    } catch (error: any) {
        console.error('[Share] Error retrieving shared chat:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve shared chat' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a shared chat
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const shareId = searchParams.get('id');

        if (!shareId) {
            return NextResponse.json(
                { error: 'Share ID is required' },
                { status: 400 }
            );
        }

        await loadSharedChats();

        if (!sharedChatsCache.has(shareId)) {
            return NextResponse.json(
                { error: 'Shared chat not found' },
                { status: 404 }
            );
        }

        sharedChatsCache.delete(shareId);
        await saveSharedChats();

        return NextResponse.json({
            success: true,
            message: 'Shared chat deleted successfully',
        });
    } catch (error: any) {
        console.error('[Share] Error deleting shared chat:', error);
        return NextResponse.json(
            { error: 'Failed to delete shared chat' },
            { status: 500 }
        );
    }
}
