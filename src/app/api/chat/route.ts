import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const { messages, model = "google/gemma-3-27b-it", datetime, timezone, isCanvasEnabled } = await req.json();
    const apiKey = process.env.NVIDIA_API_KEY;
    const url = process.env.NVIDIA_API_URL;

    if (!apiKey || !url) {
      return NextResponse.json({ error: 'API configuration missing' }, { status: 500 });
    }

    const currentTime = datetime || new Date().toISOString();
    const userTimezone = timezone || 'UTC';

    let systemContent = `You are a wise and friendly AI assistant named 'Magical'.

CURRENT DATE & TIME: ${currentTime}
USER TIMEZONE: ${userTimezone}

STRICT COMMANDS:
1. ANSWER THE USER'S QUESTION IMMEDIATELY. 
2. DO NOT introduce yourself every time. The user already knows who you are.
3. ONLY respond in the language used by the user (Thai for Thai, English for English, and other languages accordingly).
4. Be direct, helpful, and knowledgeable.
5. When asked about time, date, or current events, use the CURRENT DATE & TIME provided above.`;

    if (isCanvasEnabled) {
      systemContent += `\n\n6. CANVAS MODE ACTIVE: The user has opened the "Canvas" editor for long-form content.
   - YOU MUST PROVIDE EXTENSIVE, DETAILED, AND COMPLETE RESPONSES.
   - DO NOT SUMMARIZE. Write full articles, complete code files, or detailed step-by-step guides.
   - If generating code, output the ENTIRE file content.
   - Focus on depth, quality, and comprehensive coverage of the topic.
   - Ignore standard brevity constraints.`;
    }

    const systemPrompt = {
      role: 'system',
      content: systemContent
    };

    // Model-specific configurations
    const isNemotronModel = model === 'nvidia/nemotron-3-nano-30b-a3b';
    const isPhi4Model = model === 'microsoft/phi-4-mini-instruct';

    // Base payload
    const payload: Record<string, unknown> = {
      model: model,
      messages: [systemPrompt, ...messages],
      stream: true,
    };

    if (isNemotronModel) {
      // Nemotron with reasoning/thinking mode
      payload.temperature = 1;
      payload.top_p = 1;
      payload.max_tokens = 16384;
      payload.reasoning_budget = 16384;
      payload.chat_template_kwargs = { enable_thinking: true };
    } else if (isPhi4Model) {
      // Phi-4 Mini - smaller, faster model
      payload.temperature = 0.1;
      payload.top_p = 0.7;
      payload.max_tokens = 1024;
    } else {
      // Default settings for other models
      payload.temperature = 0.2;
      payload.top_p = 0.7;
      payload.max_tokens = 8192;
      payload.extra_body = {
        chat_template_kwargs: {
          thinking: true
        }
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "text/event-stream",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    // Return the stream directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('NVIDIA API Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
