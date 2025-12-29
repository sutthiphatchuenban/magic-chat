'use client';

import { useState } from 'react';
import { Code, Eye, Copy, Check, X, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CanvasProps {
    content: string;
    type: string;
    onClose: () => void;
}

export const Canvas = ({ content, type, onClose }: CanvasProps) => {
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed top-0 right-0 w-full md:w-[50vw] h-full bg-[#0a0a1a] border-l border-[#d4af37]/20 z-50 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
        >
            <header className="p-4 border-b border-[#d4af37]/10 flex items-center justify-between bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#d4af37]/10 rounded-lg text-[#d4af37] border border-[#d4af37]/20">
                        {type === 'html' || type === 'javascript' ? <Code size={18} /> : <Wand2 size={18} />}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[#d4af37] uppercase tracking-wider">
                            {type === 'markdown' || type === 'text' ? 'Magic Document' : 'Magic Code'}
                        </h3>
                        <p className="text-[10px] text-white/30 truncate max-w-[200px] italic">Enchanted rendering engine</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={copyToClipboard} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all">
                        {isCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded-lg text-white/40 hover:text-red-500 transition-all">
                        <X size={20} />
                    </button>
                </div>
            </header>

            <div className="flex p-1 bg-white/5 mx-4 mt-4 rounded-xl self-start">
                <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'preview' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                    <Eye size={14} /> Preview
                </button>
                <button
                    onClick={() => setActiveTab('code')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'code' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                    <Code size={14} /> Source
                </button>
            </div>

            <div className="flex-1 overflow-hidden p-6 relative bg-white/5 custom-scrollbar">
                {activeTab === 'preview' ? (
                    <div className="w-full h-full flex justify-center overflow-auto">
                        {type === 'html' ? (
                            <div className="w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl">
                                <iframe
                                    srcDoc={content}
                                    title="Preview"
                                    className="w-full h-full border-none bg-white font-sans"
                                    sandbox="allow-scripts"
                                />
                            </div>
                        ) : (
                            <div className="w-full max-w-[800px] h-fit min-h-full bg-white rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.1)] border border-gray-200 p-12 mb-12 transform origin-top transition-transform duration-500 text-slate-900">
                                <div className="prose prose-slate prose-headings:text-slate-900 prose-p:text-slate-800 prose-strong:text-slate-900 prose-li:text-slate-800 max-w-none font-serif">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full bg-black/40 rounded-xl border border-[#d4af37]/10 overflow-auto">
                        <pre className="p-4 text-xs font-mono text-white/80 leading-relaxed whitespace-pre-wrap">
                            {content}
                        </pre>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Canvas;
