'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, User, Plus, Layout,
  ChevronDown, Fullscreen, X, Code, Image as ImageIcon, Download, Copy, Pencil, Square, Search,
  Volume2, VolumeX, Microscope, Share2
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Components
import { ReasoningBlock, ConfirmDialog, Canvas, LoadingScreen } from '@/components';

// Constants & Types
import { MODELS, getAutoSelectedModel, getAutoModelFallbacks } from '@/constants/models';
import type { Message, Chat, ConfirmDialogState } from '@/types';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [customModelId, setCustomModelId] = useState('');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  // Canvas State
  const [canvasContent, setCanvasContent] = useState<string | null>(null);
  const [canvasType, setCanvasType] = useState<string>('text');
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isCanvasEnabled, setIsCanvasEnabled] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });
  const [isImageMode, setIsImageMode] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDeepResearchMode, setIsDeepResearchMode] = useState(false);
  const [isDeepResearching, setIsDeepResearching] = useState(false);
  const [deepResearchProgress, setDeepResearchProgress] = useState<string>('');
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const openInCanvas = (content: string, type: string = 'markdown') => {
    setCanvasContent(content);
    setCanvasType(type);
    setIsCanvasOpen(true);
  };

  // Native Web Speech API fallback
  const speakWithNativeTTS = async (text: string, index: number) => {
    try {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('Speech synthesis not available');
        setSpeakingMessageIndex(null);
        return;
      }
      
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const hasThai = /[\u0E00-\u0E7F]/.test(text);
      
      const thaiVoice = voices.find(v => v.lang.toLowerCase().includes('th'));
      const englishVoice = voices.find(v => v.lang.toLowerCase().includes('en'));
      
      if (hasThai && thaiVoice) {
        utterance.voice = thaiVoice;
        utterance.rate = 0.9;
      } else if (englishVoice) {
        utterance.voice = englishVoice;
        utterance.rate = 1;
      }

      utterance.onend = () => setSpeakingMessageIndex(null);
      utterance.onerror = () => setSpeakingMessageIndex(null);

      setSpeakingMessageIndex(index);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Native TTS error:', error);
      setSpeakingMessageIndex(null);
    }
  };

  // TTS (Text-to-Speech) functions using ResponsiveVoice with fallback
  const speakText = (text: string, index: number) => {
    // Stop any current speech
    const rv = (window as any).responsiveVoice;
    if (rv) rv.cancel();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (speakingMessageIndex === index) {
      setSpeakingMessageIndex(null);
      return;
    }

    // Detect language
    const hasThai = /[\u0E00-\u0E7F]/.test(text);
    const voice = hasThai ? "Thai Female" : "US English Female";
    
    setSpeakingMessageIndex(index);
    
    // Try ResponsiveVoice first
    if (rv) {
      let fallbackTriggered = false;
      
      rv.speak(text, voice, {
        rate: hasThai ? 0.9 : 1,
        pitch: 1,
        volume: 1,
        onend: () => {
          setSpeakingMessageIndex(null);
        },
        onerror: () => {
          if (!fallbackTriggered) {
            fallbackTriggered = true;
            console.warn('ResponsiveVoice failed, falling back to native TTS');
            speakWithNativeTTS(text, index);
          }
        }
      });
      
      // Timeout fallback if ResponsiveVoice doesn't respond
      setTimeout(() => {
        if (speakingMessageIndex === index && !fallbackTriggered) {
          fallbackTriggered = true;
          console.warn('ResponsiveVoice timeout, falling back to native TTS');
          rv.cancel();
          speakWithNativeTTS(text, index);
        }
      }, 2000);
    } else {
      // ResponsiveVoice not available, use native
      speakWithNativeTTS(text, index);
    }
  };

  const stopSpeaking = useCallback(() => {
    // Force stop ResponsiveVoice multiple times
    const rv = (window as any).responsiveVoice;
    if (rv && typeof rv.cancel === 'function') {
      try {
        rv.cancel();
        // Double cancel for safety
        setTimeout(() => rv.cancel(), 50);
        setTimeout(() => rv.cancel(), 100);
      } catch (e) {
        console.error('ResponsiveVoice cancel error:', e);
      }
    }
    
    // Force stop native TTS multiple times
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        // Some browsers need double cancel
        setTimeout(() => window.speechSynthesis?.cancel(), 50);
        setTimeout(() => window.speechSynthesis?.cancel(), 100);
      } catch (e) {
        console.error('SpeechSynthesis cancel error:', e);
      }
    }
    
    setSpeakingMessageIndex(null);
  }, []);

  // Share chat function
  const shareChat = async () => {
    if (messages.length <= 1 || isSharing) return;

    setIsSharing(true);
    try {
      const chatTitle = typeof messages[0]?.content === 'string'
        ? messages[0].content.slice(0, 50)
        : 'Shared Chat';

      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: chatTitle,
          messages: messages,
          expiresInDays: 30,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShareUrl(data.shareUrl);
        // Auto copy to clipboard
        await navigator.clipboard.writeText(data.shareUrl);
      } else {
        alert('Failed to share chat: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('Failed to share chat. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Fallback: ensure loading screen disappears even if there's an error
    const fallbackTimer = setTimeout(() => setIsLoaded(true), 5000);

    try {
      const savedChats = localStorage.getItem('wizard_chats');
      if (savedChats) setChats(JSON.parse(savedChats));
    } catch (e) {
      console.error('Failed to load chats:', e);
    }

    // Show loading screen for 3 seconds
    const timer = setTimeout(() => setIsLoaded(true), 3000);

    // Open sidebar by default on desktop (768px = md breakpoint)
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }

    // Stop TTS when leaving page or hiding
    const stopAllTTS = () => {
      const rv = (window as any).responsiveVoice;
      if (rv) rv.cancel();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMessageIndex(null);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAllTTS();
      }
    };

    const handleBeforeUnload = () => {
      stopAllTTS();
    };

    const handlePageHide = () => {
      stopAllTTS();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    
    // Try to stop any ongoing speech from previous session
    stopAllTTS();

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      stopAllTTS();
    };
  }, []);

  // Helper function to strip base64 images and reduce storage size
  const prepareChatsForStorage = useCallback((chatsToSave: Chat[]): Chat[] => {
    return chatsToSave.map(chat => ({
      ...chat,
      messages: chat.messages.map(msg => {
        // Handle array content (e.g., messages with images)
        if (Array.isArray(msg.content)) {
          const processedContent = msg.content.map(item => {
            if (item.type === 'image_url' && item.image_url?.url?.startsWith('data:')) {
              // Replace base64 images with a placeholder
              return { type: 'text' as const, text: '[Image was attached]' };
            }
            // Truncate very long text content
            if (item.type === 'text' && item.text && item.text.length > 5000) {
              return { type: 'text' as const, text: item.text.substring(0, 5000) + '... [truncated]' };
            }
            return item;
          });
          return { ...msg, content: processedContent };
        }
        // Handle string content
        if (typeof msg.content === 'string') {
          // Truncate very long string content
          if (msg.content.length > 10000) {
            return { ...msg, content: msg.content.substring(0, 10000) + '... [truncated]' };
          }
        }
        // Remove reasoning content to save space (it can be quite large)
        if (msg.reasoning && msg.reasoning.length > 2000) {
          return { ...msg, reasoning: msg.reasoning.substring(0, 2000) + '... [truncated]' };
        }
        return msg;
      })
    }));
  }, []);

  useEffect(() => {
    if (chats.length > 0) {
      const saveChats = (chatList: Chat[], maxChats: number): boolean => {
        try {
          const chatsToSave = chatList.slice(-maxChats);
          const preparedChats = prepareChatsForStorage(chatsToSave);
          const jsonString = JSON.stringify(preparedChats);

          // Check estimated size (localStorage has ~5MB limit)
          const estimatedSize = new Blob([jsonString]).size;
          if (estimatedSize > 4 * 1024 * 1024) { // 4MB safety threshold
            console.warn(`Chat data too large (${(estimatedSize / 1024 / 1024).toFixed(2)}MB), reducing...`);
            return false;
          }

          localStorage.setItem('wizard_chats', jsonString);
          return true;
        } catch (e) {
          console.error('Failed to save chats:', e);
          return false;
        }
      };

      // Try saving with progressively fewer chats
      if (!saveChats(chats, 20)) {
        if (!saveChats(chats, 15)) {
          if (!saveChats(chats, 10)) {
            if (!saveChats(chats, 5)) {
              // Last resort: save only the latest 3 chats
              if (!saveChats(chats, 3)) {
                // If still failing, clear storage and save just the current chat
                try {
                  localStorage.removeItem('wizard_chats');
                  const latestChat = chats.slice(-1);
                  const preparedChat = prepareChatsForStorage(latestChat);
                  localStorage.setItem('wizard_chats', JSON.stringify(preparedChat));
                } catch {
                  // Complete failure - clear everything
                  localStorage.removeItem('wizard_chats');
                  console.error('Unable to save any chats to localStorage');
                }
              }
            }
          }
        }
      }
    }
  }, [chats, prepareChatsForStorage]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const startNewChat = useCallback(() => {
    setCurrentChatId(null);
    setMessages([{
      role: 'assistant',
      content: 'สวัสดี! มีอะไรให้ช่วยไหม?'
    }]);
    setIsCanvasOpen(false);
    setIsCanvasEnabled(false);
    setIsImageMode(false);
    setIsSearchMode(false);
    setIsDeepResearchMode(false);
    stopSpeaking();
  }, [stopSpeaking]);

  const selectChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsGeneratingImage(false);
    }
  };

  const deleteChat = (chatId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Chat',
      message: 'Are you sure you want to delete this chat? This action cannot be undone.',
      onConfirm: () => {
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (currentChatId === chatId) {
          startNewChat();
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const clearAllChats = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear All Chats',
      message: 'Are you sure you want to delete ALL chat history? This action cannot be undone.',
      onConfirm: () => {
        setChats([]);
        localStorage.removeItem('wizard_chats');
        startNewChat();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!input.trim() || isGeneratingImage) return;

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const usageData = JSON.parse(localStorage.getItem('image_gen_usage') || '{}');
    const todayUsage = usageData[today] || 0;

    if (todayUsage >= 3) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '🚫 Daily limit reached! You can only generate 3 mystical images per day. Please come back tomorrow for more magic.'
      }]);
      return;
    }

    const userPrompt = input;
    setInput('');
    setIsGeneratingImage(true);

    // Add user message with generation request
    const userMessage: Message = {
      role: 'user',
      content: `🎨 Generate Image: "${userPrompt}"`
    };
    setMessages(prev => [...prev, userMessage]);

    // Add loading message
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '🎨 Generating your magical image... (This may take 10-30 seconds)'
    }]);

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt }),
        signal: controller.signal
      });

      const data = await response.json();

      if (data.success && data.image) {
        // Update daily usage count
        const newUsage = { ...usageData, [today]: todayUsage + 1 };
        localStorage.setItem('image_gen_usage', JSON.stringify(newUsage));

        const imageUrl = `data:image/png;base64,${data.image}`;
        const translatedNote = data.translated_prompt
          ? `\n\n_Translated prompt: "${data.translated_prompt}"_`
          : '';

        // Replace loading message with result
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: [
              { type: 'text', text: `✨ Here's your generated image!${translatedNote}` },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          };
          return newMessages;
        });
      } else {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: `❌ Failed to generate image: ${data.error || 'Unknown error'}\n\nPlease try again with a different prompt.`
          };
          return newMessages;
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: '❌ Image generation service is currently unavailable. Please try again later.'
        };
        return newMessages;
      });
    } finally {
      setIsGeneratingImage(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading || isGeneratingImage) return;

    // If image mode is ON, generate image instead of chat
    if (isImageMode && input.trim() && !selectedImage) {
      handleGenerateImage();
      return;
    }

    let userContent: any = input;
    if (selectedImage) {
      userContent = [
        { type: "text", text: input || "What is in this image?" },
        { type: "image_url", image_url: { url: selectedImage } }
      ];
    }

    const originalInput = input;
    
    // Check if we're editing an existing message
    const editIndexStr = inputRef.current?.getAttribute('data-edit-index');
    const editIndex = editIndexStr ? parseInt(editIndexStr, 10) : -1;
    
    let newMessages: Message[];
    
    if (editIndex >= 0 && editIndex < messages.length) {
      // Editing mode: remove all messages from editIndex onwards
      // and replace with the edited message
      newMessages = messages.slice(0, editIndex);
      const editedMessage: Message = { role: 'user', content: userContent };
      newMessages = [...newMessages, editedMessage];
      // Clear the edit index
      inputRef.current?.removeAttribute('data-edit-index');
    } else {
      // Normal mode: append new message
      const userMessage: Message = { role: 'user', content: userContent };
      newMessages = [...messages, userMessage];
    }
    
    setMessages(newMessages);
    setInput('');
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setSelectedImage(null);
    setIsLoading(true);

    // Prepare messages for API - convert old image/search messages to text-only
    // to prevent re-processing on subsequent chats
    let messagesToSend = newMessages.map((msg, index) => {
      // Keep the latest user message as-is (it may contain the new image/search)
      if (index === newMessages.length - 1) return msg;
      
      // Convert old messages with images to text-only
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        const textParts = msg.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join(' ');
        return {
          ...msg,
          content: textParts || '[Image analyzed previously]'
        };
      }
      
      // Convert old search context messages to simple text
      if (msg.role === 'user' && typeof msg.content === 'string' && msg.content.includes('Search Results for')) {
        // Extract just the reference links from old search results
        const refMatch = msg.content.match(/References?:\s*([\s\S]*)$/i);
        const refs = refMatch ? refMatch[1].trim() : '';
        return {
          ...msg,
          content: refs ? `[Previous search references]\n${refs}` : '[Search performed previously]'
        };
      }
      
      // Convert old system search messages to simple text
      if (msg.role === 'system' && typeof msg.content === 'string' &&
          (msg.content.includes('[System]: I searched for') || msg.content.includes('[System]: Search failed'))) {
        return {
          ...msg,
          content: '[Search performed previously]'
        };
      }
      
      return msg;
    });

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Handle Search Mode
      if (isSearchMode && typeof originalInput === 'string' && originalInput.trim()) {
        console.log('[Search] Triggered for:', originalInput);
        try {
          setIsSearching(true);
          // Add explicit delay to make sure user sees the searching indicator
          const [searchResponse] = await Promise.all([
            fetch('/api/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: originalInput }),
              signal: controller.signal
            }),
            new Promise(resolve => setTimeout(resolve, 1500))
          ]);

          const searchData = await searchResponse.json();
          setIsSearching(false);

          if (searchData.success && searchData.results?.length > 0) {
            const context = searchData.results.map((r: any, i: number) =>
              `Source [${i + 1}]: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`
            ).join('\n\n');

            // Pre-formatted clickable reference links
            const refLinks = searchData.results.map((r: any, i: number) =>
              `- [${r.title}](${r.url})`
            ).join('\n');

            const searchContextMessage: Message = {
              role: 'user',
              content: `Search Results for "${originalInput}":\n\n${context}\n\n---\nSTRICT FORMAT RULES:\n1. Answer the question using these sources.\n2. At the END, include "References:" section with these EXACT markdown links:\n\n${refLinks}\n\nCopy the links above exactly as shown.`
            };
            messagesToSend = [...newMessages, searchContextMessage];
          } else {
            messagesToSend = [...newMessages, { role: 'system', content: `[System]: I searched for "${originalInput}" but found no results. Answering from internal knowledge.` }];
          }
        } catch (err) {
          console.error('[Search] Failed:', err);
          setIsSearching(false);
          messagesToSend = [...newMessages, { role: 'system', content: `[System]: Search failed. Answering from internal knowledge.` }];
        }
      } else if (isSearchMode) {
      console.log('[Search] Skipped - input type:', typeof originalInput, 'value:', originalInput);
    }

    // Handle Deep Research Mode
    if (isDeepResearchMode && typeof originalInput === 'string' && originalInput.trim()) {
      console.log('[Deep Research] Triggered for:', originalInput);
      try {
        setIsDeepResearching(true);
        setDeepResearchProgress('Starting research...');
        
        const deepResearchResponse = await fetch('/api/deep-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: originalInput, maxRounds: 3 }),
          signal: controller.signal
        });

        const deepResearchData = await deepResearchResponse.json();
        setIsDeepResearching(false);
        setDeepResearchProgress('');

        if (deepResearchData.success && deepResearchData.totalRounds > 0) {
          const researchContextMessage: Message = {
            role: 'user',
            content: deepResearchData.context
          };
          messagesToSend = [...newMessages, researchContextMessage];
        } else {
          messagesToSend = [...newMessages, { role: 'system', content: `[System]: Deep research completed but no results found. Answering from internal knowledge.` }];
        }
      } catch (err) {
        console.error('[Deep Research] Failed:', err);
        setIsDeepResearching(false);
        setDeepResearchProgress('');
        messagesToSend = [...newMessages, { role: 'system', content: `[System]: Deep research failed. Answering from internal knowledge.` }];
      }
    } else if (isDeepResearchMode) {
      console.log('[Deep Research] Skipped - input type:', typeof originalInput, 'value:', originalInput);
    }

    // Auto model selection logic with fallback
      let modelToSend: string;
      let fallbackModels: string[] = [];

      if (selectedModel.id === 'auto') {
        const hasImage = !!selectedImage;
        modelToSend = getAutoSelectedModel(hasImage);
        fallbackModels = getAutoModelFallbacks(hasImage);
      } else if (selectedModel.id === 'custom') {
        modelToSend = customModelId;
      } else {
        modelToSend = selectedModel.id;
      }

      // Try to fetch with fallback for auto mode
      let response: Response | null = null;
      let currentModelIndex = 0;
      const modelsToTry = selectedModel.id === 'auto' ? fallbackModels : [modelToSend];

      for (const model of modelsToTry) {
        try {
          console.log(`[Auto] Trying model: ${model}`);
          response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: messagesToSend,
              model: model,
              datetime: new Date().toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' }),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              isCanvasEnabled: isCanvasEnabled || isDeepResearchMode // Force Canvas for Deep Research
            }),
            signal: controller.signal
          });

          if (response.ok) {
            console.log(`[Auto] Success with model: ${model}`);
            break;
          } else {
            console.log(`[Auto] Failed with model: ${model}, trying next...`);
          }
        } catch (err) {
          console.log(`[Auto] Error with model: ${model}`, err);
        }
        currentModelIndex++;
      }

      if (!response || !response.ok) throw new Error('All models failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantRawBuffer = '';
      let reasoningStreamBuffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', reasoning: '' }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              const delta = data.choices[0].delta;
              if (delta?.reasoning_content) reasoningStreamBuffer += delta.reasoning_content;
              if (delta?.content) assistantRawBuffer += delta.content;

              let displayContent = assistantRawBuffer;
              let taggedReasoning = '';

              if (assistantRawBuffer.includes('<think>')) {
                const parts = assistantRawBuffer.split(/<think>|<\/think>/);
                if (assistantRawBuffer.includes('</think>')) {
                  taggedReasoning = parts[1] || '';
                  displayContent = (parts[0] || '') + (parts[2] || '');
                } else {
                  taggedReasoning = parts[1] || '';
                  displayContent = parts[0] || '';
                }
              }

              // Intelligent Canvas Detection
              if (isCanvasEnabled) {
                const hasStructure = /^(#|\d+\.|-|\*)\s/m.test(displayContent);
                const isLongForm = displayContent.length > 600;
                const hasCodeBlock = /```(html|javascript|typescript|react|markdown|text|css|json|md|txt|js|ts)/i.test(displayContent);

                if (hasCodeBlock) {
                  const typeMatch = displayContent.match(/```(html|javascript|typescript|react|markdown|text|css|json|md|txt|js|ts)/i);
                  if (typeMatch) {
                    const currentType = typeMatch[1].toLowerCase();
                    const normalizedType = currentType === 'md' ? 'markdown' : currentType === 'txt' ? 'text' : currentType;
                    const codeMatch = displayContent.match(new RegExp(`\`\`\`${currentType}\\s*\\n?([\\s\\S]*?)($|\`\`\`)`, 'i'));
                    if (codeMatch && codeMatch[1].length > 40) {
                      setCanvasContent(codeMatch[1]);
                      setCanvasType(normalizedType);
                      setIsCanvasOpen(true);
                    }
                  }
                } else if (isLongForm && hasStructure) {
                  setCanvasContent(displayContent);
                  setCanvasType('markdown');
                  setIsCanvasOpen(true);
                }
              }

              setMessages(prev => {
                const updatedMessages = [...prev];
                const last = updatedMessages[updatedMessages.length - 1];
                last.content = displayContent;
                last.reasoning = reasoningStreamBuffer + taggedReasoning;
                return updatedMessages;
              });
            } catch (e) { }
          }
        }
      }

      let finalAssistantContent = assistantRawBuffer;
      let finalReasoningContent = reasoningStreamBuffer;
      if (assistantRawBuffer.includes('<think>')) {
        const parts = assistantRawBuffer.split(/<think>|<\/think>/);
        if (parts.length > 1) {
          finalReasoningContent += parts[1] || '';
          finalAssistantContent = (parts[0] || '') + (parts[2] || '');
        }
      }

      const finalMessages = [...newMessages, { role: 'assistant', content: finalAssistantContent, reasoning: finalReasoningContent } as Message];
      if (currentChatId) {
        setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: finalMessages } : c));
      } else {
        const newId = Date.now().toString();
        const newChat: Chat = { id: newId, title: typeof userContent === 'string' ? userContent.slice(0, 30) : "Vision Chat", messages: finalMessages };
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newId);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      const errorMessage = `⚠️ **${selectedModel.name}** is currently unavailable.\n\nThis model might be temporarily down or overloaded. Please try:\n\n1. **Switch to a different model** using the dropdown above\n2. Wait a moment and try again\n\n_Click on the model name to see other options._`;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
      setIsDeepResearchMode(false); // Reset Deep Research mode after use
      abortControllerRef.current = null;
    }
  };

  const renderContent = (content: string | any[], role: string = 'assistant') => {
    if (typeof content === 'string') {
      return (
        <div className="relative group/msg">
          {role === 'assistant' && content.length > 200 && (
            <button
              onClick={() => openInCanvas(content)}
              className="absolute -right-12 top-0 p-2 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border border-[#d4af37]/20 rounded-lg text-[#d4af37] opacity-0 group-hover/msg:opacity-100 transition-all shadow-xl"
              title="Open in Canvas"
            >
              <Fullscreen size={16} />
            </button>
          )}
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <div className="mb-2 last:mb-0">{children}</div>,
              strong: ({ children }) => <strong className="font-bold text-[#d4af37]">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc ml-6 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal ml-6 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="marker:text-[#d4af37]">{children}</li>,
              a: ({ node, ...props }) => <a {...props} className="text-[#d4af37] underline hover:text-[#f0e68c] transition-colors" target="_blank" rel="noopener noreferrer" />,
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
                const match = /language-(\w+)/.exec(className || '')
                return !inline ? (
                  <div className="relative group my-4">
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openInCanvas(String(children), match ? match[1] : 'text')}
                          className="p-1.5 bg-white/10 hover:bg-[#d4af37] hover:text-black rounded text-[10px] font-bold backdrop-blur-md border border-white/10 transition-all uppercase"
                        >
                          Canvas
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(String(children))}
                          className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-[10px] backdrop-blur-md border border-white/10"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <pre className="p-4 rounded-xl bg-black/40 border border-white/10 overflow-x-auto custom-scrollbar font-mono text-sm leading-relaxed" {...props}>
                      <code>{children}</code>
                    </pre>
                  </div>
                ) : (
                  <code className="bg-white/10 px-1.5 py-0.5 rounded text-[#d4af37] font-mono text-sm" {...props}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {content.map((item, idx) => {
          if (item.type === 'text') return (
            <ReactMarkdown
              key={idx}
              remarkPlugins={[remarkGfm]}
              components={{
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
              }}
            >
              {item.text}
            </ReactMarkdown>
          );
          if (item.type === 'image_url') return (
            <div key={idx} className="relative group inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url.url}
                alt="Generated"
                className="rounded-2xl max-h-80 shadow-2xl border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setPreviewImage(item.image_url.url)}
              />
              <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => setPreviewImage(item.image_url.url)}
                  className="p-2.5 bg-black/60 hover:bg-[#d4af37] text-white hover:text-black rounded-xl transition-all backdrop-blur-md border border-white/20 shadow-lg"
                  title="View Full Size"
                >
                  <Fullscreen size={18} />
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = item.image_url.url;
                    link.download = `magical-image-${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="p-2.5 bg-black/60 hover:bg-[#d4af37] text-white hover:text-black rounded-xl transition-all backdrop-blur-md border border-white/20 shadow-lg"
                  title="Download Image"
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
          );
          return null;
        })}
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {!isLoaded && <LoadingScreen />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        className="flex h-dvh bg-[#050510] text-[#e0e0f0] overflow-hidden font-sans relative"
      >
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none opacity-10 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#d4af37] rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#4b0082] rounded-full blur-[150px]" />
        </div>

        {/* Sidebar Overlay for Mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-60 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{
            width: isSidebarOpen ? 260 : 0,
          }}
          transition={{ duration: 0.2 }}
          className={`fixed md:relative h-full bg-[#0a0a15] md:bg-black/40 backdrop-blur-xl border-r border-[#d4af37]/10 flex flex-col z-70 md:z-20 overflow-hidden ${isSidebarOpen ? 'shadow-2xl md:shadow-none' : ''}`}
        >
          <div className="p-4 flex flex-col h-full overflow-hidden w-65">
            <button onClick={() => { startNewChat(); if (window.innerWidth < 768) setIsSidebarOpen(false); }} className="flex items-center gap-2 w-full p-2.5 hover:bg-white/5 rounded-lg transition-all border border-[#d4af37]/10">
              <Plus size={18} className="text-[#d4af37]" />
              <span className="text-sm font-medium whitespace-nowrap">New chat</span>
            </button>
            <div className="mt-8 flex flex-col gap-1 overflow-y-auto flex-1 custom-scrollbar">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`group relative flex items-center rounded-lg transition-all ${currentChatId === chat.id ? 'bg-[#d4af37]/10' : 'hover:bg-white/5'}`}
                >
                  <button
                    onClick={() => { selectChat(chat.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`text-sm text-left p-2.5 truncate flex-1 whitespace-nowrap ${currentChatId === chat.id ? 'text-[#d4af37]' : ''}`}
                  >
                    {chat.title}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                    className="absolute right-1 p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete chat"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {chats.length > 0 && (
              <button
                onClick={clearAllChats}
                className="mt-4 flex items-center justify-center gap-2 w-full p-2 hover:bg-red-500/10 border border-red-500/20 rounded-lg text-red-400/60 hover:text-red-400 transition-all text-xs"
              >
                <X size={14} />
                Clear all chats
              </button>
            )}

            <div className="mt-4 pt-4 border-t border-[#d4af37]/10 flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-lg transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-[#d4af37] flex items-center justify-center text-black font-bold">S</div>
              <div className="text-sm font-medium">User</div>
            </div>

            {/* Storage Info Note */}
            <div className="mt-3 p-2.5 bg-white/5 rounded-lg border border-white/10">
              <p className="text-[10px] text-white/40 leading-relaxed">
                Chats are stored in <span className="text-[#d4af37]/70">localStorage</span> on this browser only
              </p>
              <p className="text-[10px] text-white/30 mt-1 leading-relaxed">
                Images are not saved permanently
              </p>
            </div>
          </div>
        </motion.aside>

        {/* Main Content - Always full width on mobile, adjusts on desktop */}
        <main className={`flex-1 flex flex-col relative h-full transition-all duration-300 w-full ${isCanvasOpen ? 'hidden md:flex md:mr-[50vw]' : ''} ${isSidebarOpen ? 'md:ml-0' : ''}`}>
          {/* Loading Progress Bar */}
          {(isLoading || isGeneratingImage) && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-50 overflow-hidden">
              <motion.div
                className="h-full bg-linear-to-r from-[#d4af37] via-[#f0e68c] to-[#d4af37]"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                style={{ width: '50%' }}
              />
            </div>
          )}
          {/* Header */}
          <header className="flex items-center justify-between p-2 sm:p-4 z-40">
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-[#d4af37]/70"><Layout size={20} /></button>
              <div className="relative">
                <div onClick={() => setIsModelMenuOpen(!isModelMenuOpen)} className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer group">
                  <span className="font-semibold text-[#d4af37] flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                    {selectedModel.vision && selectedModel.id !== 'auto' && <ImageIcon size={16} className="text-[#d4af37]" />}
                    <span className="hidden sm:inline">{selectedModel.name}</span>
                    <span className="sm:hidden">{selectedModel.name.split(' ')[0]}</span>
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                </div>
                <AnimatePresence>
                  {isModelMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-56 sm:w-64 bg-[#0a0a1a] border border-[#d4af37]/20 rounded-xl shadow-2xl p-2 z-50 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                      {[...MODELS].sort((a, b) => {
                        // Sort: Auto first, then vision models, then others
                        if (a.id === 'auto') return -1;
                        if (b.id === 'auto') return 1;
                        if (a.vision && !b.vision) return -1;
                        if (!a.vision && b.vision) return 1;
                        return 0;
                      }).map(model => (
                        <button key={model.id} onClick={() => { setSelectedModel(model); setIsModelMenuOpen(false); }} className={`flex items-center justify-between w-full p-2 sm:p-3 rounded-lg hover:bg-white/5 transition-all text-sm ${selectedModel.id === model.id ? 'text-[#d4af37] bg-[#d4af37]/5' : ''}`}>
                          <span>{model.name}</span>
                          {model.vision && model.id !== 'auto' && <ImageIcon size={14} className="text-[#d4af37]" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Share Button */}
              {messages.length > 1 && (
                <button
                  onClick={shareChat}
                  disabled={isSharing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSharing
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-white/5 hover:bg-[#d4af37]/20 text-white/60 hover:text-[#d4af37] border border-white/10'
                  }`}
                  title="Share this chat"
                >
                  {isSharing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Share2 size={14} />
                    </motion.div>
                  ) : (
                    <Share2 size={14} />
                  )}
                  <span className="hidden sm:inline">{isSharing ? 'Sharing...' : 'Share'}</span>
                </button>
              )}
              {isCanvasOpen && (
                <button onClick={() => setIsCanvasOpen(false)} className="flex items-center gap-2 text-xs text-[#d4af37] hover:underline underline-offset-4">
                  Close Canvas
                </button>
              )}
              <span className="text-[#d4af37] font-bold text-sm">FREE</span>
            </div>
          </header>

          {/* Chat Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 sm:px-4 w-full max-w-3xl mx-auto custom-scrollbar pt-2 sm:pt-10 pb-28 sm:pb-48">
            {messages.length <= 1 ? (
              <div className="h-full flex flex-col items-center justify-center -mt-10 sm:-mt-20 px-4">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-12 sm:w-16 h-12 sm:h-16 flex items-center justify-center mb-6 sm:mb-8"><Image src="/icon.png" alt="Logo" width={48} height={48} className="sm:hidden" /><Image src="/icon.png" alt="Logo" width={64} height={64} className="hidden sm:block" /></motion.div>
                <h2 className="text-xl sm:text-3xl font-bold bg-linear-to-r from-white to-white/60 bg-clip-text text-transparent text-center">Magical AI Assistant</h2>
                <p className="mt-3 sm:mt-4 text-white/40 text-center text-sm sm:text-base max-w-md">I can chat, build websites, write code, and generate images!</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-8">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group/msg relative`}>
                    <div className={`flex gap-2 sm:gap-4 max-w-[95%] sm:max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#4b0082]' : 'bg-[#d4af37]'}`}>
                        {msg.role === 'user' ? <User size={16} /> : <Image src="/icon.png" alt="Logo" width={20} height={20} />}
                      </div>
                      <div className="flex flex-col gap-1 w-full min-w-0">
                        {msg.reasoning && <ReasoningBlock reasoning={msg.reasoning} />}
                        <div className={`relative group/bubble w-full ${msg.role === 'user' ? 'bg-white/5 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-white/10 text-sm sm:text-base' : 'font-serif text-base sm:text-lg leading-relaxed'}`}>
                          {renderContent(msg.content, msg.role)}

                          {/* Message Actions */}
                          <div className={`absolute -bottom-8 ${msg.role === 'user' ? 'right-0' : 'left-0'} flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1`}>
                            {/* TTS Button - Only for assistant messages */}
                            {msg.role === 'assistant' && typeof msg.content === 'string' && (
                              <button
                                onClick={() => {
                                  if (speakingMessageIndex === i) {
                                    stopSpeaking();
                                  } else {
                                    // Strip markdown for cleaner speech
                                    const content = msg.content as string;
                                    const cleanText = content
                                      .replace(/```[\s\S]*?```/g, '[code block]')
                                      .replace(/`([^`]+)`/g, '$1')
                                      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                                      .replace(/[#*_~]/g, '');
                                    speakText(cleanText, i);
                                  }
                                }}
                                className={`p-1.5 rounded transition-colors ${speakingMessageIndex === i ? 'text-[#d4af37] bg-[#d4af37]/10' : 'text-white/40 hover:text-[#d4af37] hover:bg-white/10'}`}
                                title={speakingMessageIndex === i ? 'Stop speaking' : 'Read aloud'}
                              >
                                {speakingMessageIndex === i ? <VolumeX size={13} /> : <Volume2 size={13} />}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const text = typeof msg.content === 'string' ? msg.content : msg.content.map(c => c.type === 'text' ? c.text : '').join('');
                                navigator.clipboard.writeText(text);
                              }}
                              className="p-1.5 text-white/40 hover:text-[#d4af37] hover:bg-white/10 rounded transition-colors"
                              title="Copy"
                            >
                              <Copy size={13} />
                            </button>
                            {msg.role === 'user' && (typeof msg.content === 'string' || (Array.isArray(msg.content) && msg.content.some(c => c.type === 'text'))) && (
                              <button
                                onClick={() => {
                                  const text = typeof msg.content === 'string' ? msg.content : msg.content.map(c => c.type === 'text' ? c.text : '').join('');
                                  setInput(text);
                                  // Store the index of message being edited
                                  (inputRef.current as any)?.setAttribute('data-edit-index', i.toString());
                                  inputRef.current?.focus();
                                }}
                                className="p-1.5 text-white/40 hover:text-[#d4af37] hover:bg-white/10 rounded transition-colors"
                                title="Edit & Regenerate"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Typing/Searching/Researching Indicator */}
                {(isLoading || isSearching || isDeepResearching) && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
                  <div className="flex gap-4 items-start">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${isDeepResearching ? 'bg-blue-500' : isSearching ? 'bg-green-500' : 'bg-[#d4af37]'}`}>
                      {isSearching || isDeepResearching ? (
                        <Search size={16} className="text-white animate-pulse" />
                      ) : (
                        <Image src="/icon.png" alt="Logo" width={20} height={20} className="animate-pulse" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className={`w-2 h-2 ${isDeepResearching ? 'bg-blue-500' : isSearching ? 'bg-green-500' : 'bg-[#d4af37]'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></span>
                          <span className={`w-2 h-2 ${isDeepResearching ? 'bg-blue-500' : isSearching ? 'bg-green-500' : 'bg-[#d4af37]'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></span>
                          <span className={`w-2 h-2 ${isDeepResearching ? 'bg-blue-500' : isSearching ? 'bg-green-500' : 'bg-[#d4af37]'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></span>
                        </div>
                        <span className={`text-sm ${isDeepResearching ? 'text-blue-400' : isSearching ? 'text-green-400' : 'text-white/50'}`}>
                          {isDeepResearching ? 'Deep research in progress...' : isSearching ? 'Searching the web...' : 'AI is thinking...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
              {selectedImage && (
                <div className="absolute bottom-full mb-4 left-0">
                  <div className="relative border-2 border-[#d4af37] rounded-xl overflow-hidden shadow-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedImage} alt="Preview" className="h-16 sm:h-20 w-auto" />
                    <button type="button" onClick={() => setSelectedImage(null)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1"><X size={12} /></button>
                  </div>
                </div>
              )}
              <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[28px] p-2 sm:p-3 backdrop-blur-3xl flex flex-col gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Auto resize
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Ask anything..."
                  rows={1}
                  className="w-full bg-transparent px-3 sm:px-4 py-2 text-sm sm:text-base focus:outline-none placeholder:text-white/20 resize-none max-h-50 custom-scrollbar"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5 sm:gap-1 items-center">
                    <button disabled={!selectedModel.vision} onClick={() => fileInputRef.current?.click()} type="button" className={`p-1.5 sm:p-2 rounded-lg ${selectedModel.vision ? 'hover:bg-white/5 text-[#d4af37]' : 'opacity-20 pointer-events-none'}`}><Plus size={18} /></button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

                    {/* Canvas Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsCanvasEnabled(!isCanvasEnabled)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isCanvasEnabled
                        ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30'
                        : 'bg-white/5 text-white/30 border border-white/10 hover:text-white/50'
                        }`}
                      title={isCanvasEnabled ? "Canvas Mode: ON" : "Canvas Mode: OFF"}
                    >
                      <Code size={14} />
                      <span className="hidden sm:inline">Canvas</span>
                    </button>

                    {/* Generate Image Button */}
                    <button
                      type="button"
                      onClick={() => setIsImageMode(!isImageMode)}
                      disabled={isGeneratingImage}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isImageMode
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-white/5 text-white/30 border border-white/10 hover:text-white/50'
                        } ${isGeneratingImage ? 'animate-pulse' : ''}`}
                      title={isImageMode ? "Image Mode: ON (พิมพ์แล้วกด Send เพื่อสร้างภาพ)" : "Image Mode: OFF"}
                    >
                      {isGeneratingImage ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <ImageIcon size={14} />
                        </motion.div>
                      ) : (
                        <ImageIcon size={14} />
                      )}
                      <span className="hidden sm:inline">{isGeneratingImage ? 'Creating...' : 'Image'}</span>
                    </button>

                    {/* Search Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsSearchMode(!isSearchMode)}
                      disabled={isDeepResearchMode}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isSearchMode
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-white/30 border border-white/10 hover:text-white/50'
                        } ${isDeepResearchMode ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title={isSearchMode ? "Search Mode: ON (AI จะค้นหาข้อมูลจาก Internet)" : "Search Mode: OFF"}
                    >
                      <Search size={14} />
                      <span className="hidden sm:inline">Search</span>
                    </button>

                    {/* Deep Research Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsDeepResearchMode(!isDeepResearchMode)}
                      disabled={isSearchMode || isDeepResearching}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isDeepResearchMode
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-white/5 text-white/30 border border-white/10 hover:text-white/50'
                        } ${(isSearchMode || isDeepResearching) ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title={isDeepResearchMode ? "Deep Research: ON (AI จะค้นหาลึก 3 รอบ)" : "Deep Research: OFF"}
                    >
                      {isDeepResearching ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Microscope size={14} />
                        </motion.div>
                      ) : (
                        <Microscope size={14} />
                      )}
                      <span className="hidden sm:inline">{isDeepResearching ? 'Deep Research...' : 'Deep Research'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {isLoading || isGeneratingImage ? (
                      <button
                        type="button"
                        onClick={stopGeneration}
                        className="p-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all animate-pulse"
                      >
                        <Square size={18} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className={`p-2 rounded-full transition-all ${input.trim() || selectedImage ? (isImageMode ? 'bg-purple-500 text-white' : 'bg-white text-black') : 'bg-white/5 text-white/20'}`}
                      >
                        <Send size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </main>

        {/* Canvas Panel */}
        <AnimatePresence>
          {isCanvasOpen && (
            <Canvas
              content={canvasContent || ''}
              type={canvasType}
              onClose={() => setIsCanvasOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Share Dialog */}
        <AnimatePresence>
          {shareUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-200 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShareUrl(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0a0a1a] border border-[#d4af37]/20 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-white mb-2">Chat Shared!</h3>
                <p className="text-white/60 text-sm mb-4">Your chat is now public. Anyone with this link can view it.</p>

                <div className="bg-black/40 border border-white/10 rounded-xl p-3 mb-4">
                  <code className="text-sm text-[#d4af37] break-all">{shareUrl}</code>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#d4af37] hover:bg-[#f0e68c] text-black rounded-xl font-medium transition-all"
                  >
                    <Copy size={16} />
                    Copy Link
                  </button>
                  <button
                    onClick={() => setShareUrl(null)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmDialog.onConfirm}
        />

        {/* Image Preview Modal */}
        <AnimatePresence>
          {previewImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-200 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setPreviewImage(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative max-w-[90vw] max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImage}
                  alt="Preview"
                  className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/20"
                />

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewImage;
                      link.download = `magical-image-${Date.now()}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="p-3 bg-[#d4af37] hover:bg-[#f0e68c] text-black rounded-xl transition-all shadow-lg"
                    title="Download"
                  >
                    <Download size={20} />
                  </button>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all backdrop-blur-md border border-white/20 shadow-lg"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
