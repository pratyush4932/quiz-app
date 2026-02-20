"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, actions }: ModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(44, 26, 14, 0.5)' }}
                    >
                        {/* Modal Container */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative"
                            style={{
                                background: 'rgba(250, 243, 224, 0.92)',
                                border: '1px solid rgba(139, 69, 19, 0.3)',
                                backdropFilter: 'blur(12px)',
                                boxShadow: '0 8px 32px rgba(101, 55, 0, 0.25)',
                            }}
                        >
                            {/* Header */}
                            <div
                                className="flex justify-between items-center p-6"
                                style={{
                                    borderBottom: '1px solid rgba(139, 69, 19, 0.2)',
                                    background: 'rgba(196, 124, 53, 0.12)',
                                }}
                            >
                                <h3
                                    className="text-xl font-bold tracking-wide"
                                    style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif' }}
                                >
                                    {title}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="transition-colors"
                                    style={{ color: 'var(--ink-faded)' }}
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 leading-relaxed text-sm" style={{ color: 'var(--ink-light)' }}>
                                {children}
                            </div>

                            {/* Actions */}
                            {actions && (
                                <div className="p-6 pt-0 flex justify-end gap-3">
                                    {actions}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
