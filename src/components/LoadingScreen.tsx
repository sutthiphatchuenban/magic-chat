'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wand2 } from 'lucide-react';

export const LoadingScreen = () => {
    const [isMounted, setIsMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        setIsMobile(window.innerWidth < 768);
    }, []);

    // Reduced particles for mobile (5 instead of 20)
    const particles = isMobile
        ? [
            { x: 20, y: 30 }, { x: 80, y: 50 }, { x: 50, y: 70 },
            { x: 30, y: 20 }, { x: 70, y: 80 }
        ]
        : [
            { x: 10, y: 20 }, { x: 85, y: 45 }, { x: 30, y: 70 }, { x: 60, y: 15 },
            { x: 45, y: 55 }, { x: 75, y: 80 }, { x: 20, y: 40 }, { x: 90, y: 30 },
            { x: 50, y: 85 }, { x: 15, y: 60 }
        ];

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[200] bg-[#050510] flex items-center justify-center overflow-hidden"
        >
            {/* Background Effects - Simplified for mobile */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Floating Particles - Reduced count */}
                {isMounted && particles.map((pos, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-[#d4af37] rounded-full"
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        animate={{
                            y: [-20, -80],
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3,
                            ease: 'easeOut'
                        }}
                    />
                ))}

                {/* Single Glowing Orb - Reduced blur on mobile */}
                <div
                    className={`absolute top-1/4 left-1/4 ${isMobile ? 'w-48 h-48 blur-[50px]' : 'w-96 h-96 blur-[100px]'} bg-[#d4af37]/20 rounded-full`}
                />
                <div
                    className={`absolute bottom-1/4 right-1/4 ${isMobile ? 'w-48 h-48 blur-[50px]' : 'w-96 h-96 blur-[100px]'} bg-[#4b0082]/30 rounded-full`}
                />

                {/* Single Magic Circle - Only on desktop */}
                {!isMobile && (
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-[#d4af37]/20 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    />
                )}
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Wand Icon with Glow */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.8, bounce: 0.4 }}
                    className="relative mb-8"
                >
                    <div className="absolute inset-0 bg-[#d4af37] rounded-3xl blur-xl opacity-50" />
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#d4af37] to-[#b8972e] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#d4af37]/30">
                        <Wand2 size={40} className="text-black sm:hidden" />
                        <Wand2 size={48} className="text-black hidden sm:block" />
                    </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4"
                >
                    <span className="bg-gradient-to-r from-[#d4af37] via-[#f0e68c] to-[#d4af37] bg-clip-text text-transparent">
                        Magical AI
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-white/40 text-center mb-8 sm:mb-12 text-sm sm:text-base"
                >
                    Loading...
                </motion.p>

                {/* Loading Bar */}
                <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 180 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                    className="relative"
                >
                    <div className="w-[180px] sm:w-[200px] h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[#d4af37] via-[#f0e68c] to-[#d4af37] rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ delay: 0.8, duration: 2.5, ease: 'easeInOut' }}
                        />
                    </div>
                </motion.div>
            </div>

            {/* Bottom Decoration - Hidden on mobile */}
            <div className="absolute bottom-6 sm:bottom-8 text-center hidden sm:block">
                <p className="text-[10px] text-white/20 tracking-widest uppercase">
                    Powered by AI
                </p>
            </div>
        </motion.div>
    );
};

export default LoadingScreen;
