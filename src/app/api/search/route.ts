import { NextResponse } from 'next/server';

// Domains to filter out (low quality or irrelevant)
const BLOCKED_DOMAINS = [
    'facebook.com',
    'fb.com',
    'tiktok.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'pinterest.com',
    'reddit.com',
    'youtube.com',
    'youtu.be',
    'linkedin.com',
    'quora.com',
    'discord.com',
    'tumblr.com',
];

function isBlockedDomain(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return BLOCKED_DOMAINS.some(domain => lowerUrl.includes(domain));
}

export async function POST(req: Request) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        // Use DuckDuckGo HTML search
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        const html = await response.text();

        const results: Array<{ title: string; url: string; snippet: string }> = [];

        // Extract all result blocks
        const blocks = html.split(/<div[^>]*class="[^"]*result[^"]*"[^>]*>/i);

        for (let i = 1; i < blocks.length && results.length < 8; i++) {
            const block = blocks[i];

            // Find URL (uddg contains the actual URL)
            const uddgMatch = block.match(/uddg=([^&"]+)/);
            let url = '';
            if (uddgMatch) {
                url = decodeURIComponent(uddgMatch[1]);
            } else {
                // Try to find direct href
                const hrefMatch = block.match(/href="(https?:\/\/[^"]+)"/);
                if (hrefMatch) {
                    url = hrefMatch[1];
                }
            }

            // Skip blocked domains
            if (!url || isBlockedDomain(url) || url.includes('duckduckgo.com')) {
                continue;
            }

            // Find title (text inside result__a link)
            const titleMatch = block.match(/class="[^"]*result__a[^"]*"[^>]*>([^<]+)</i);
            const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&#x27;/g, "'") : '';

            // Find snippet
            const snippetMatch = block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
            let snippet = '';
            if (snippetMatch) {
                snippet = snippetMatch[1]
                    .replace(/<[^>]+>/g, '') // Remove HTML tags
                    .replace(/&amp;/g, '&')
                    .replace(/&#x27;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            if (url && title && title.length > 3) {
                results.push({ title, url, snippet });
            }
        }

        // Fallback: Try simpler extraction if no results
        if (results.length === 0) {
            const simpleRegex = /uddg=([^&"]+)[^>]*>([^<]+)</g;
            let match;
            while ((match = simpleRegex.exec(html)) !== null && results.length < 5) {
                const url = decodeURIComponent(match[1]);
                const title = match[2].trim();
                if (url && title && title.length > 5 && !isBlockedDomain(url) && !url.includes('duckduckgo.com')) {
                    results.push({ title, url, snippet: '' });
                }
            }
        }

        console.log(`[Search API] Query: "${query}" - Found ${results.length} results`);

        return NextResponse.json({
            success: true,
            results: results.slice(0, 5), // Return max 5 results
            query
        });

    } catch (error: any) {
        console.error('Search API Error:', error.message);
        return NextResponse.json(
            { error: error.message || 'Search failed' },
            { status: 500 }
        );
    }
}
