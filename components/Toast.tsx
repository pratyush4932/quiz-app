"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string | null;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [message, duration, onClose]);

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md min-w-[300px]
                        ${type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                            type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}
                >
                    <div className="text-xl">
                        {type === 'success' && <FaCheckCircle />}
                        {type === 'error' && <FaExclamationCircle />}
                        {type === 'info' && <FaExclamationCircle />}
                    </div>
                    <p className="flex-1 font-semibold text-sm">{message}</p>
                    <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
                        <FaTimes />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
