declare module '*.css';

// ResponsiveVoice API declarations
interface ResponsiveVoiceOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  onend?: () => void;
  onerror?: () => void;
}

interface ResponsiveVoice {
  cancel(): void;
  speak(text: string, voice: string, options?: ResponsiveVoiceOptions): void;
}

declare global {
  interface Window {
    responsiveVoice?: ResponsiveVoice;
    speechSynthesis?: SpeechSynthesis;
  }
}
