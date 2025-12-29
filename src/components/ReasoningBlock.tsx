'use client';

import { useState } from 'react';
import { Brain, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReasoningBlockProps {
    reasoning: string;
}

export const ReasoningBlock = ({ reasoning }: ReasoningBlockProps) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="mb-4 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-[#d4af37]/20 transition-all group"
            >
                <div className="p-1 bg-[#d4af37]/10 rounded border border-[#d4af37]/20">
                    <Brain size={14} className="text-[#d4af37]" />
                </div>
                <span className="text-xs font-medium text-[#d4af37]/80 group-hover:text-[#d4af37]">Thinking Process</span>
                <ChevronDown size={12} className={`text-[#d4af37]/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 overflow-hidden"
                    >
                        <div className="bg-[#0a0a1a]/50 border-l-2 border-[#d4af37]/30 p-4 rounded-r-xl text-sm text-[#d4af37]/60 italic font-serif leading-relaxed backdrop-blur-sm max-h-60 overflow-y-auto custom-scrollbar">
                            {reasoning}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReasoningBlock;
