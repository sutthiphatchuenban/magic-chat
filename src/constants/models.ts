export interface ModelConfig {
    id: string;
    name: string;
    icon: string;
    vision: boolean;
    fileTypes: string[];
}

export const MODELS: ModelConfig[] = [
    { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B', icon: '✨', vision: true, fileTypes: ['PNG', 'JPG', 'JPEG'] },
    { id: 'deepseek-ai/deepseek-v3.1-terminus', name: 'DeepSeek V3.1', icon: '🧠', vision: false, fileTypes: [] },
    { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', icon: '🚀', vision: false, fileTypes: [] },
    { id: 'meta/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 Vision', icon: '👁️', vision: true, fileTypes: ['PNG', 'JPG', 'JPEG'] },
    { id: 'minimaxai/minimax-m2', name: 'MiniMax M2', icon: '🔥', vision: false, fileTypes: [] },
    { id: 'qwen/qwen3-next-80b-a3b-instruct', name: 'Qwen 3 Next', icon: '☁️', vision: false, fileTypes: [] },
];

export default MODELS;
