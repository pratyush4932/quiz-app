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

    const typeStyles = {
        success: {
            background: 'rgba(74, 124, 63, 0.12)',
            border: '1px solid rgba(74, 124, 63, 0.35)',
            color: '#2d5a27',
        },
        error: {
            background: 'rgba(139, 37, 0, 0.1)',
            border: '1px solid rgba(139, 37, 0, 0.3)',
            color: 'var(--error)',
        },
        info: {
            background: 'rgba(139, 69, 19, 0.1)',
            border: '1px solid rgba(139, 69, 19, 0.3)',
            color: 'var(--ink-faded)',
        },
    };

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md min-w-[300px]"
                    style={{
                        ...typeStyles[type],
                        background: `${typeStyles[type].background}`,
                        boxShadow: '0 8px 32px rgba(101, 55, 0, 0.2)',
                    }}
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
