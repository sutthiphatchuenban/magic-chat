'use client';

import { motion } from 'framer-motion';

interface ConfirmDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

export const ConfirmDialog = ({
    isOpen,
    onCancel,
    onConfirm,
    title,
    message
}: ConfirmDialogProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0a0a1a] border border-[#d4af37]/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            >
                <h3 className="text-lg font-bold text-[#d4af37] mb-2">{title}</h3>
                <p className="text-sm text-white/60 mb-6">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm transition-all"
                    >
                        Delete
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ConfirmDialog;
