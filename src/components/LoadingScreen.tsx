'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Sparkles } from 'lucide-react';

export const LoadingScreen = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Pre-defined particle positions to avoid hydration mismatch
    const particles = [
        { x: 10, y: 20 }, { x: 85, y: 45 }, { x: 30, y: 70 }, { x: 60, y: 15 },
        { x: 45, y: 55 }, { x: 75, y: 80 }, { x: 20, y: 40 }, { x: 90, y: 30 },
        { x: 50, y: 85 }, { x: 15, y: 60 }, { x: 70, y: 25 }, { x: 35, y: 90 },
        { x: 80, y: 50 }, { x: 25, y: 75 }, { x: 55, y: 10 }, { x: 5, y: 35 },
        { x: 65, y: 65 }, { x: 40, y: 5 }, { x: 95, y: 55 }, { x: 12, y: 88 },
    ];

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="fixed inset-0 z-[200] bg-[#050510] flex items-center justify-center overflow-hidden"
        >
            {/* Magical Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Floating Particles - Only render after mount to avoid hydration issues */}
                {isMounted && particles.map((pos, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-[#d4af37] rounded-full"
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        animate={{
                            y: [-20, -100 - (i * 10)],
                            opacity: [0, 1, 0],
                            scale: [0, 1.5, 0]
                        }}
                        transition={{
                            duration: 3 + (i % 3),
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: 'easeOut'
                        }}
                    />
                ))}

                {/* Glowing Orbs */}
                <motion.div
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#d4af37]/20 rounded-full blur-[100px]"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#4b0082]/30 rounded-full blur-[100px]"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                />

                {/* Magic Circle */}
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-[#d4af37]/10 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-[#d4af37]/20 rounded-full"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-[#d4af37]/10 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Wand Icon with Glow */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', duration: 1.5, bounce: 0.4 }}
                    className="relative mb-8"
                >
                    <motion.div
                        className="absolute inset-0 bg-[#d4af37] rounded-3xl blur-2xl"
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 0.8, 0.5]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-[#d4af37] to-[#b8972e] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#d4af37]/30">
                        <Wand2 size={48} className="text-black" />
                    </div>

                    {/* Sparkle Effects */}
                    <motion.div
                        className="absolute -top-2 -right-2"
                        animate={{ scale: [0, 1, 0], rotate: [0, 180, 360] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    >
                        <Sparkles size={20} className="text-[#d4af37]" />
                    </motion.div>
                    <motion.div
                        className="absolute -bottom-1 -left-1"
                        animate={{ scale: [0, 1, 0], rotate: [0, -180, -360] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    >
                        <Sparkles size={16} className="text-[#d4af37]" />
                    </motion.div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="text-4xl md:text-5xl font-bold text-center mb-4"
                >
                    <span className="bg-gradient-to-r from-[#d4af37] via-[#f0e68c] to-[#d4af37] bg-clip-text text-transparent">
                        Magical AI
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className="text-white/40 text-center mb-12 font-serif italic"
                >
                    Summoning the arcane powers...
                </motion.p>

                {/* Loading Bar */}
                <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 200 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="relative"
                >
                    <div className="w-[200px] h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[#d4af37] via-[#f0e68c] to-[#d4af37] rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ delay: 1.2, duration: 2, ease: 'easeInOut' }}
                        />
                    </div>

                    {/* Loading Text */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                        className="mt-4 text-center"
                    >
                        <motion.span
                            className="text-xs text-[#d4af37]/60 uppercase tracking-[0.3em]"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            Loading Magic
                        </motion.span>
                    </motion.div>
                </motion.div>
            </div>

            {/* Bottom Decoration */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="absolute bottom-8 text-center"
            >
                <p className="text-[10px] text-white/20 tracking-widest uppercase">
                    Powered by Ancient Spells & Modern AI
                </p>
            </motion.div>
        </motion.div>
    );
};

export default LoadingScreen;
