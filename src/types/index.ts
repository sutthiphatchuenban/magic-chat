export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string | MessageContent[];
    reasoning?: string;
}

export interface MessageContent {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
}

export interface Chat {
    id: string;
    title: string;
    messages: Message[];
}

export interface ConfirmDialogState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}
