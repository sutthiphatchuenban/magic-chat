'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { ArrowLeft, Copy, Check, Eye, Calendar, MessageSquare, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { Message } from '@/types';

interface SharedChatData {
    id: string;
    title: string;
    messages: Message[];
    createdAt: string;
    viewCount: number;
}

export default function SharedChatPage() {
    const params = useParams();
    const shareId = params.id as string;
    const [chat, setChat] = useState<SharedChatData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchSharedChat() {
            try {
                const response = await fetch(`/api/share?id=${shareId}`);
                const data = await response.json();

                if (data.success) {
                    setChat(data.chat);
                } else {
                    setError(data.error || 'Failed to load shared chat');
                }
            } catch (err) {
                setError('Failed to load shared chat');
            } finally {
                setLoading(false);
            }
        }

        if (shareId) {
            fetchSharedChat();
        }
    }, [shareId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chat?.messages]);

    const copyToClipboard = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderContent = (content: string | any[]) => {
        if (typeof content === 'string') {
            return (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        p: ({ children }) => <div className="mb-2 last:mb-0">{children}</div>,
                        strong: ({ children }) => <strong className="font-bold text-[#d4af37]">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc ml-6 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal ml-6 mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="marker:text-[#d4af37]">{children}</li>,
                        a: ({ node, ...props }) => (
                            <a {...props} className="text-[#d4af37] underline hover:text-[#f0e68c] transition-colors" target="_blank" rel="noopener noreferrer" />
                        ),
                        table: ({ children }) => (
                            <div className="my-4 overflow-x-auto rounded-xl border border-[#d4af37]/20">
                                <table className="min-w-full divide-y divide-[#d4af37]/20">{children}</table>
                            </div>
                        ),
                        thead: ({ children }) => <thead className="bg-[#d4af37]/10">{children}</thead>,
                        tbody: ({ children }) => <tbody className="divide-y divide-white/10 bg-black/20">{children}</tbody>,
                        tr: ({ children }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
                        th: ({ children }) => <th className="px-4 py-3 text-left text-sm font-semibold text-[#d4af37] uppercase tracking-wider">{children}</th>,
                        td: ({ children }) => <td className="px-4 py-3 text-sm text-white/80 whitespace-nowrap">{children}</td>,
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline ? (
                                <div className="relative group my-4">
                                    <pre className="p-4 rounded-xl bg-black/40 border border-white/10 overflow-x-auto custom-scrollbar font-mono text-sm leading-relaxed" {...props}>
                                        <code>{children}</code>
                                    </pre>
                                </div>
                            ) : (
                                <code className="bg-white/10 px-1.5 py-0.5 rounded text-[#d4af37] font-mono text-sm" {...props}>
                                    {children}
                                </code>
                            );
                        },
                    }}
                >
                    {content}
                </ReactMarkdown>
            );
        }

        return (
            <div className="space-y-3">
                {content.map((item, idx) => {
                    if (item.type === 'text') {
                        return (
                            <ReactMarkdown
                                key={idx}
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ children }) => <div className="mb-2 last:mb-0">{children}</div>,
                                    strong: ({ children }) => <strong className="font-bold text-[#d4af37]">{children}</strong>,
                                    a: ({ node, ...props }) => (
                                        <a {...props} className="text-[#d4af37] underline hover:text-[#f0e68c] transition-colors" target="_blank" rel="noopener noreferrer" />
                                    ),
                                }}
                            >
                                {item.text}
                            </ReactMarkdown>
                        );
                    }
                    if (item.type === 'image_url') {
                        return (
                            <div key={idx} className="relative inline-block">
                                <img
                                    src={item.image_url.url}
                                    alt="Shared"
                                    className="rounded-2xl max-h-80 shadow-2xl border border-white/10"
                                />
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050510] text-[#e0e0f0] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-4">
                        <Image src="/icon.png" alt="Loading" width={64} height={64} className="animate-pulse" />
                    </div>
                    <p className="text-white/50">Loading shared chat...</p>
                </motion.div>
            </div>
        );
    }

    if (error || !chat) {
        return (
            <div className="min-h-screen bg-[#050510] text-[#e0e0f0] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-md mx-auto px-4"
                >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                        <MessageSquare size={40} className="text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Chat Not Found</h1>
                    <p className="text-white/50 mb-6">{error || 'This shared chat may have expired or been deleted.'}</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#d4af37] hover:bg-[#f0e68c] text-black rounded-xl font-medium transition-all"
                    >
                        <ArrowLeft size={18} />
                        Go to Magic Chat
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050510] text-[#e0e0f0]">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none opacity-10 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#d4af37] rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#4b0082] rounded-full blur-[150px]" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a15]/80 backdrop-blur-xl border-b border-[#d4af37]/10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <Link
                                href="/"
                                className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl transition-all shrink-0"
                            >
                                <ArrowLeft size={20} className="text-[#d4af37]" />
                            </Link>
                            <div className="min-w-0">
                                <h1 className="font-semibold text-white truncate">{chat.title}</h1>
                                <div className="flex items-center gap-3 text-xs text-white/40">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {formatDate(chat.createdAt)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Eye size={12} />
                                        {chat.viewCount} views
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={copyToClipboard}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
                                copied
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                            }`}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Chat Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div ref={scrollRef} className="space-y-6">
                    {chat.messages.map((msg, i) => (
                        msg.role !== 'system' && (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            msg.role === 'user' ? 'bg-[#4b0082]' : 'bg-[#d4af37]'
                                        }`}
                                    >
                                        {msg.role === 'user' ? (
                                            <span className="text-sm font-bold">U</span>
                                        ) : (
                                            <Image src="/icon.png" alt="AI" width={20} height={20} />
                                        )}
                                    </div>
                                    <div
                                        className={`px-4 py-3 rounded-2xl ${
                                            msg.role === 'user'
                                                ? 'bg-white/5 border border-white/10'
                                                : 'font-serif'
                                        }`}
                                    >
                                        {renderContent(msg.content)}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-white/10 text-center">
                    <p className="text-white/30 text-sm mb-4">Shared from Magic Chat</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#d4af37] hover:bg-[#f0e68c] text-black rounded-xl font-medium transition-all"
                    >
                        <ExternalLink size={18} />
                        Try Magic Chat
                    </Link>
                </div>
            </main>
        </div>
    );
}
