export interface ModelConfig {
    id: string;
    name: string;
    icon: string;
    vision: boolean;
    fileTypes: string[];
}

export const MODELS: ModelConfig[] = [
    { id: 'auto', name: 'Auto', icon: '🪄', vision: true, fileTypes: ['PNG', 'JPG', 'JPEG'] },
    { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B', icon: '✨', vision: true, fileTypes: ['PNG', 'JPG', 'JPEG'] },
    { id: 'nvidia/nemotron-3-nano-30b-a3b', name: 'Nemotron Nano', icon: '🟢', vision: false, fileTypes: [] },
    { id: 'microsoft/phi-4-mini-instruct', name: 'Phi-4 Mini', icon: '🔷', vision: false, fileTypes: [] },
    { id: 'moonshotai/kimi-k2-thinking', name: 'Kimi K2 Thinking', icon: '🌙', vision: false, fileTypes: [] },
    { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 Instruct', icon: '🌓', vision: false, fileTypes: [] },
    { id: 'qwen/qwen3-coder-480b-a35b-instruct', name: 'Qwen 3 Coder 480B', icon: '💻', vision: false, fileTypes: [] },
    { id: 'mistralai/mistral-medium-3-instruct', name: 'Mistral Medium 3', icon: '🌊', vision: true, fileTypes: [] },
    { id: 'deepseek-ai/deepseek-v3.1-terminus', name: 'DeepSeek V3.1', icon: '🧠', vision: false, fileTypes: [] },
    { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', icon: '🚀', vision: false, fileTypes: [] },
    { id: 'meta/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 Vision', icon: '👁️', vision: true, fileTypes: ['PNG', 'JPG', 'JPEG'] },
    { id: 'minimaxai/minimax-m2', name: 'MiniMax M2', icon: '🔥', vision: false, fileTypes: [] },
    { id: 'qwen/qwen3-next-80b-a3b-instruct', name: 'Qwen 3 Next', icon: '☁️', vision: false, fileTypes: [] },
];

// Fallback models list (ordered by priority)
export const TEXT_MODEL_FALLBACKS = [
    'google/gemma-3-27b-it',
    'nvidia/nemotron-3-nano-30b-a3b',
    'microsoft/phi-4-mini-instruct',
    'mistralai/mistral-medium-3-instruct',
    'deepseek-ai/deepseek-v3.1-terminus',
    'qwen/qwen3-next-80b-a3b-instruct',
    'minimaxai/minimax-m2',
];

export const VISION_MODEL_FALLBACKS = [
    'google/gemma-3-27b-it',
    'mistralai/mistral-medium-3-instruct',
    'meta/llama-3.2-90b-vision-instruct',
];

// Default models for auto selection
export const DEFAULT_TEXT_MODEL = 'google/gemma-3-27b-it';
export const DEFAULT_VISION_MODEL = 'google/gemma-3-27b-it';

// Function to auto-select model based on context
export const getAutoSelectedModel = (hasImage: boolean): string => {
    return hasImage ? DEFAULT_VISION_MODEL : DEFAULT_TEXT_MODEL;
};

// Get fallback models list
export const getAutoModelFallbacks = (hasImage: boolean): string[] => {
    return hasImage ? VISION_MODEL_FALLBACKS : TEXT_MODEL_FALLBACKS;
};

export default MODELS;
