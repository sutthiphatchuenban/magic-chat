'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Wand2, User, Plus, Layout,
  ChevronDown, UserCircle, Fullscreen, X, Code, Image as ImageIcon, Download, Copy, Pencil, Square, Search
} from 'lucide-react';
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

  const openInCanvas = (content: string, type: string = 'markdown') => {
    setCanvasContent(content);
    setCanvasType(type);
    setIsCanvasOpen(true);
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

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (chats.length > 0) {
      try {
        // Keep only the latest 20 chats to prevent quota exceeded
        const chatsToSave = chats.slice(-20);
        localStorage.setItem('wizard_chats', JSON.stringify(chatsToSave));
      } catch (e) {
        console.error('Failed to save chats:', e);
        // If quota exceeded, remove old chats and try again
        try {
          const reducedChats = chats.slice(-10);
          localStorage.setItem('wizard_chats', JSON.stringify(reducedChats));
        } catch {
          // If still failing, clear storage
          localStorage.removeItem('wizard_chats');
        }
      }
    }
  }, [chats]);

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
  }, []);

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
        setChats(prev => {
          const updatedChats = prev.filter(c => c.id !== chatId);
          localStorage.setItem('wizard_chats', JSON.stringify(updatedChats));
          return updatedChats;
        });
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
    const userMessage: Message = { role: 'user', content: userContent };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setSelectedImage(null);
    setIsLoading(true);

    let messagesToSend = [...newMessages];

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
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
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
      const errorMessage = `⚠️ **${selectedModel.name}** is currently unavailable.\n\nThis model might be temporarily down or overloaded. Please try:\n\n1. **Switch to a different model** using the dropdown above\n2. Wait a moment and try again\n\n_Click on the model name (${selectedModel.icon} ${selectedModel.name}) to see other options._`;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
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
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-[#d4af37]">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc ml-6 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal ml-6 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="marker:text-[#d4af37]">{children}</li>,
              a: ({ node, ...props }) => <a {...props} className="text-[#d4af37] underline hover:text-[#f0e68c] transition-colors" target="_blank" rel="noopener noreferrer" />,
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
            <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]}>
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
        className="flex h-[100dvh] bg-[#050510] text-[#e0e0f0] overflow-hidden font-sans relative"
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
              className="fixed inset-0 bg-black/50 z-[60] md:hidden"
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
          className={`fixed md:relative h-full bg-[#0a0a15] md:bg-black/40 backdrop-blur-xl border-r border-[#d4af37]/10 flex flex-col z-[70] md:z-20 overflow-hidden ${isSidebarOpen ? 'shadow-2xl md:shadow-none' : ''}`}
        >
          <div className="p-4 flex flex-col h-full overflow-hidden w-[260px]">
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
          </div>
        </motion.aside>

        {/* Main Content - Always full width on mobile, adjusts on desktop */}
        <main className={`flex-1 flex flex-col relative h-full transition-all duration-300 w-full ${isCanvasOpen ? 'hidden md:flex md:mr-[50vw]' : ''} ${isSidebarOpen ? 'md:ml-0' : ''}`}>
          {/* Loading Progress Bar */}
          {(isLoading || isGeneratingImage) && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-50 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#d4af37] via-[#f0e68c] to-[#d4af37]"
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
                    <span>{selectedModel.icon}</span>
                    <span className="hidden sm:inline">{selectedModel.name}</span>
                    <span className="sm:hidden">{selectedModel.name.split(' ')[0]}</span>
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                </div>
                <AnimatePresence>
                  {isModelMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-56 sm:w-64 bg-[#0a0a1a] border border-[#d4af37]/20 rounded-xl shadow-2xl p-2 z-50 overflow-hidden">
                      {MODELS.map(model => (
                        <button key={model.id} onClick={() => { setSelectedModel(model); setIsModelMenuOpen(false); }} className={`flex items-center justify-between w-full p-2 sm:p-3 rounded-lg hover:bg-white/5 transition-all text-sm ${selectedModel.id === model.id ? 'text-[#d4af37] bg-[#d4af37]/5' : ''}`}>
                          <div className="flex items-center gap-2"><span>{model.icon}</span>{model.name}</div>
                          {model.vision && <span className="text-[10px] bg-[#d4af37]/10 px-1.5 rounded text-[#d4af37]">Vision</span>}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex gap-4">
              {isCanvasOpen && (
                <button onClick={() => setIsCanvasOpen(false)} className="flex items-center gap-2 text-xs text-[#d4af37] hover:underline underline-offset-4">
                  Close Canvas
                </button>
              )}
              <UserCircle size={24} className="text-[#d4af37]/50 pointer-cursor" />
            </div>
          </header>

          {/* Chat Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 sm:px-4 w-full max-w-3xl mx-auto custom-scrollbar pt-2 sm:pt-10 pb-28 sm:pb-48">
            {messages.length <= 1 ? (
              <div className="h-full flex flex-col items-center justify-center -mt-10 sm:-mt-20 px-4">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-12 sm:w-16 h-12 sm:h-16 bg-[#d4af37] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)] mb-6 sm:mb-8"><Wand2 size={28} className="text-black sm:hidden" /><Wand2 size={32} className="text-black hidden sm:block" /></motion.div>
                <h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent text-center">Magical AI Assistant</h2>
                <p className="mt-3 sm:mt-4 text-white/40 text-center text-sm sm:text-base max-w-md">I can chat, build websites, write code, and generate images!</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-8">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group/msg relative`}>
                    <div className={`flex gap-2 sm:gap-4 max-w-[95%] sm:max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#4b0082]' : 'bg-[#d4af37]'}`}>
                        {msg.role === 'user' ? <User size={16} /> : <Wand2 size={16} className="text-black" />}
                      </div>
                      <div className="flex flex-col gap-1 w-full min-w-0">
                        {msg.reasoning && <ReasoningBlock reasoning={msg.reasoning} />}
                        <div className={`relative group/bubble w-full ${msg.role === 'user' ? 'bg-white/5 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-white/10 text-sm sm:text-base' : 'font-serif text-base sm:text-lg leading-relaxed'}`}>
                          {renderContent(msg.content, msg.role)}

                          {/* Message Actions */}
                          <div className={`absolute -bottom-8 ${msg.role === 'user' ? 'right-0' : 'left-0'} flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1`}>
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
                                  inputRef.current?.focus();
                                }}
                                className="p-1.5 text-white/40 hover:text-[#d4af37] hover:bg-white/10 rounded transition-colors"
                                title="Edit & Send Again"
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
                {/* Typing/Searching Indicator */}
                {(isLoading || isSearching) && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
                  <div className="flex gap-4 items-start">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${isSearching ? 'bg-green-500' : 'bg-[#d4af37]'}`}>
                      {isSearching ? (
                        <Search size={16} className="text-white animate-pulse" />
                      ) : (
                        <Wand2 size={16} className="text-black animate-pulse" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className={`w-2 h-2 ${isSearching ? 'bg-green-500' : 'bg-[#d4af37]'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></span>
                          <span className={`w-2 h-2 ${isSearching ? 'bg-green-500' : 'bg-[#d4af37]'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></span>
                          <span className={`w-2 h-2 ${isSearching ? 'bg-green-500' : 'bg-[#d4af37]'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></span>
                        </div>
                        <span className={`text-sm ${isSearching ? 'text-green-400' : 'text-white/50'}`}>
                          {isSearching ? 'Searching the web...' : 'AI is thinking...'}
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
                  className="w-full bg-transparent px-3 sm:px-4 py-2 text-sm sm:text-base focus:outline-none placeholder:text-white/20 resize-none max-h-[200px] custom-scrollbar"
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
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isSearchMode
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-white/30 border border-white/10 hover:text-white/50'
                        }`}
                      title={isSearchMode ? "Search Mode: ON (AI จะค้นหาข้อมูลจาก Internet)" : "Search Mode: OFF"}
                    >
                      <Search size={14} />
                      <span className="hidden sm:inline">Search</span>
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
              className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
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
