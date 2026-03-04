import { NextResponse } from 'next/server';

// Domains to filter out (low quality or irrelevant)
const BLOCKED_DOMAINS = [
    'facebook.com', 'fb.com', 'tiktok.com', 'instagram.com',
    'twitter.com', 'x.com', 'pinterest.com', 'reddit.com',
    'youtube.com', 'youtu.be', 'linkedin.com', 'quora.com',
    'discord.com', 'tumblr.com',
];

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
];

function isBlockedDomain(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return BLOCKED_DOMAINS.some(domain => lowerUrl.includes(domain));
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchDuckDuckGo(query: string, retries = 3): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    console.log(`[Search] Query: "${query}"`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[Search] Attempt ${attempt}/${retries}`);
            
            // Random delay between 500-1500ms to avoid rate limiting
            if (attempt > 1) {
                const waitTime = 500 + Math.random() * 1000;
                console.log(`[Search] Waiting ${Math.round(waitTime)}ms before retry...`);
                await delay(waitTime);
            }
            
            // Rotate user agents
            const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
            
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                }
            });

    const html = await response.text();
    console.log(`[Search] HTML length: ${html.length}`);
    
    // Check if we got a valid response
    if (html.includes('No results found') || html.length < 1000) {
        console.log('[Search] No results or blocked');
        return [];
    }
    
    const results: Array<{ title: string; url: string; snippet: string }> = [];
    
    // Try multiple patterns for different DuckDuckGo layouts
    const patterns = [
        // Pattern 1: Standard result blocks
        /<div[^>]*class="[^"]*result[^"]*"[^>]*>/i,
        // Pattern 2: Web results
        /<div[^>]*class="[^"]*web-result[^"]*"[^>]*>/i,
        // Pattern 3: Result links
        /<a[^>]*class="[^"]*result__a[^"]*"[^>]*>/i,
    ];
    
    for (const pattern of patterns) {
        const blocks = html.split(pattern);
        console.log(`[Search] Pattern ${pattern}: ${blocks.length} blocks`);
        
        for (let i = 1; i < blocks.length && results.length < 5; i++) {
            const block = blocks[i];
            
            // Try to extract URL from various formats
            let url = '';
            // Format 1: uddg parameter
            const uddgMatch = block.match(/uddg=([^&"]+)/);
            if (uddgMatch) {
                url = decodeURIComponent(uddgMatch[1]);
            }
            // Format 2: Direct href
            if (!url) {
                const hrefMatch = block.match(/href="(https?:\/\/[^"]+)"/);
                if (hrefMatch) url = hrefMatch[1];
            }
            // Format 3: data-url attribute
            if (!url) {
                const dataUrlMatch = block.match(/data-url="([^"]+)"/);
                if (dataUrlMatch) url = dataUrlMatch[1];
            }

            if (!url || isBlockedDomain(url) || url.includes('duckduckgo.com')) continue;

            // Try to extract title
            let title = '';
            const titleMatch = block.match(/class="[^"]*result__a[^"]*"[^>]*>([^<]+)</i);
            if (titleMatch) {
                title = titleMatch[1].trim().replace(/&/g, '&').replace(/&#x27;/g, "'").replace(/"/g, '"');
            }
            // Alternative title pattern
            if (!title) {
                const altTitleMatch = block.match(/<a[^>]*>([^<]{5,100})<\/a>/i);
                if (altTitleMatch) title = altTitleMatch[1].trim();
            }

            // Try to extract snippet
            let snippet = '';
            const snippetMatch = block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
            if (snippetMatch) {
                snippet = snippetMatch[1]
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&/g, '&')
                    .replace(/&#x27;/g, "'")
                    .replace(/"/g, '"')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
            // Alternative snippet pattern
            if (!snippet) {
                const altSnippetMatch = block.match(/<p[^>]*>([\s\S]{20,500})<\/p>/i);
                if (altSnippetMatch) {
                    snippet = altSnippetMatch[1]
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                }
            }

            if (url && title && title.length > 3) {
                results.push({ title, url, snippet });
                console.log(`[Search] Found: ${title.substring(0, 50)}...`);
            }
        }
        
        if (results.length > 0) break; // Stop if we found results
    }

    console.log(`[Search] Total results: ${results.length}`);
    
    if (results.length > 0) {
        return results;
    }
    
    // Retry if no results
    if (attempt < retries) {
        console.log(`[Search] No results, will retry...`);
    }
    
    } catch (error) {
        console.error(`[Search] Attempt ${attempt} failed:`, error);
        if (attempt === retries) {
            return [];
        }
    }
    }
    
    return [];
}

export async function POST(req: Request) {
    try {
        const { query, maxRounds = 3 } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const allResults: Array<{ round: number; query: string; results: any[] }> = [];
        const followUpQuestions: string[] = [];
        
        let currentQuery = query;
        const apiKey = process.env.NVIDIA_API_KEY;
        const url = process.env.NVIDIA_API_URL;

        // Deep Research: Multiple rounds of search
        for (let round = 1; round <= maxRounds; round++) {
            console.log(`[Deep Research] Round ${round}: Searching for "${currentQuery}"`);
            
            // Search current query
            const searchResults = await searchDuckDuckGo(currentQuery);
            
            if (searchResults.length === 0) {
                console.log(`[Deep Research] Round ${round}: No results found`);
                break;
            }

            allResults.push({
                round,
                query: currentQuery,
                results: searchResults
            });

            // If not the last round, ask AI what else to search
            if (round < maxRounds && apiKey && url) {
                const context = searchResults.map((r, i) => 
                    `Source [${i + 1}]: ${r.title}\n${r.snippet}`
                ).join('\n\n');

                const previousQuestions = allResults.map(r => r.query).join('; ');
                
                const prompt = `You are a research assistant. Based on the search results below, what specific follow-up question should I search next to get more comprehensive information?

Original question: "${query}"
Already searched: ${previousQuestions}

Current search results:
${context}

IMPORTANT RULES:
1. If the results already fully answer the original question, respond with "COMPLETE"
2. If you need more specific information, provide ONE follow-up question (max 10 words)
3. The question should be specific and searchable
4. Do NOT ask questions that are too similar to what was already searched

Respond with ONLY the follow-up question or "COMPLETE".`;

                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'google/gemma-3-27b-it',
                            messages: [{ role: 'user', content: prompt }],
                            max_tokens: 100,
                            temperature: 0.3
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const followUp = data.choices?.[0]?.message?.content?.trim();
                        
                        if (followUp && followUp !== 'COMPLETE' && followUp.length > 5) {
                            currentQuery = followUp.replace(/["'?]/g, '');
                            followUpQuestions.push(currentQuery);
                            console.log(`[Deep Research] Follow-up question: ${currentQuery}`);
                        } else {
                            console.log(`[Deep Research] Research complete after ${round} rounds`);
                            break;
                        }
                    } else {
                        break;
                    }
                } catch (err) {
                    console.error('[Deep Research] AI follow-up failed:', err);
                    break;
                }
            }
        }

        // Compile all results
        const compiledContext = allResults.map((round, idx) => {
            const context = round.results.map((r, i) =>
                `Source [${idx + 1}.${i + 1}]: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`
            ).join('\n\n');
            return `=== Search Round ${round.round}: "${round.query}" ===\n\n${context}`;
        }).join('\n\n\n');

        const allRefLinks = allResults.flatMap((round, idx) =>
            round.results.map(r => `- [${r.title}](${r.url}) (from: ${round.query})`)
        ).join('\n');

        // Build comprehensive research prompt
        const researchPrompt = `You are conducting DEEP RESEARCH on: "${query}"

After ${allResults.length} rounds of comprehensive web searches, here are the findings:

${compiledContext}

---

## CRITICAL INSTRUCTIONS FOR DEEP RESEARCH RESPONSE:

### 1. COMPREHENSIVE ANALYSIS REQUIRED
- Provide an EXTENSIVE, DETAILED response (minimum 800 words)
- Cover ALL aspects of the topic found in the sources
- Do NOT summarize - provide full explanations

### 2. STRUCTURE YOUR RESPONSE
- **Introduction**: Context and overview
- **Main Body**: Detailed analysis organized by themes/subtopics
- **Key Findings**: Important discoveries from the research
- **Different Perspectives**: Present multiple viewpoints when available
- **Conclusion**: Synthesize the information
- **References**: Cite all sources

### 3. DEPTH REQUIREMENTS
- Explain concepts thoroughly
- Include specific details, numbers, dates when available
- Connect information from multiple sources
- Highlight contradictions or gaps in the research
- Draw meaningful conclusions

### 4. FORMATTING
- Use clear headings and subheadings
- Use bullet points for lists
- Use bold for emphasis
- Include direct quotes when relevant

### 5. REFERENCES SECTION (REQUIRED)
At the END, include:

## References
${allRefLinks}

Remember: This is DEEP RESEARCH - be thorough, comprehensive, and detailed!`;

        return NextResponse.json({
            success: true,
            totalRounds: allResults.length,
            queries: allResults.map(r => r.query),
            followUpQuestions,
            context: researchPrompt,
            refLinks: allRefLinks,
            totalSources: allResults.reduce((sum, r) => sum + r.results.length, 0)
        });

    } catch (error: any) {
        console.error('[Deep Research] Error:', error);
        return NextResponse.json(
            { error: 'Deep research failed', message: error.message },
            { status: 500 }
        );
    }
}
