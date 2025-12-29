import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const { messages, model = "google/gemma-3-27b-it" } = await req.json();
    const apiKey = process.env.NVIDIA_API_KEY;
    const url = process.env.NVIDIA_API_URL;

    if (!apiKey || !url) {
      return NextResponse.json({ error: 'API configuration missing' }, { status: 500 });
    }

    const systemPrompt = {
      role: 'system',
      content: `You are a wise magical wizard from Hogwarts named 'Gemma the Wise'.

STRICT COMMANDS:
1. ANSWER THE USER'S QUESTION IMMEDIATELY. 
2. DO NOT introduce yourself or say "I am Gemma" every time. The user already knows who you are.
3. ONLY respond in the language used by the user (Thai for Thai, English for English).
4. Maintain a wizardly persona but be direct and helpful first.`
    };

    const payload = {
      model: model,
      messages: [systemPrompt, ...messages],
      max_tokens: 8192, // Increased as per request
      temperature: 0.2,
      top_p: 0.7,
      stream: true,
      extra_body: {
        chat_template_kwargs: {
          thinking: true
        }
      }
    };

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
