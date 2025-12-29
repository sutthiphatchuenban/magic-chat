import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { prompt, aspect_ratio = "16:9" } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const invokeUrl = process.env.NVIDIA_IMAGE_GEN_URL!;

        const headers = {
            "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
            "Accept": "application/json",
            "Content-Type": "application/json",
        };

        // First, translate Thai to English if detected
        let englishPrompt = prompt;
        const hasThaiChars = /[\u0E00-\u0E7F]/.test(prompt);

        if (hasThaiChars) {
            try {
                const translateResponse = await fetch(process.env.NVIDIA_API_URL || "https://integrate.api.nvidia.com/v1/chat/completions", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'google/gemma-3-27b-it',
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a translator. Translate the following Thai text to English. Only output the translation, nothing else. Make it suitable for an image generation prompt - be descriptive and visual.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        max_tokens: 200,
                        temperature: 0.3,
                    }),
                });

                if (translateResponse.ok) {
                    const translateData = await translateResponse.json();
                    englishPrompt = translateData.choices?.[0]?.message?.content?.trim() || prompt;
                }
            } catch (e) {
                console.error('Translation failed, using original prompt:', e);
            }
        }

        const payload = {
            prompt: englishPrompt,
            cfg_scale: 5,
            aspect_ratio: aspect_ratio,
            seed: 0,
            steps: 50,
            negative_prompt: "blurry, low quality, distorted, deformed"
        };

        const response = await fetch(invokeUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Image generation failed:', errorText);
            return NextResponse.json(
                { error: 'Image generation failed', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // The API returns base64 encoded image
        return NextResponse.json({
            success: true,
            image: data.image, // base64 image data
            translated_prompt: hasThaiChars ? englishPrompt : null,
            original_prompt: prompt
        });

    } catch (error: any) {
        console.error('Image generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate image', message: error.message },
            { status: 500 }
        );
    }
}
