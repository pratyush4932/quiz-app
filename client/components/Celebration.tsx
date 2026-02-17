"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CelebrationProps {
    trigger: boolean;
}

export default function Celebration({ trigger }: CelebrationProps) {
    const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

    useEffect(() => {
        if (trigger) {
            const colors = ['#3A86FF', '#8338EC', '#FF006E', '#9EF01A', '#FFBE0B'];
            const newParticles = Array.from({ length: 50 }).map((_, i) => ({
                id: Date.now() + i,
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                color: colors[Math.floor(Math.random() * colors.length)],
            }));
            setParticles(newParticles);

            // Cleanup after animation
            const timer = setTimeout(() => setParticles([]), 2000);
            return () => clearTimeout(timer);
        }
    }, [trigger]);

    return (
        <AnimatePresence>
            {particles.length > 0 && (
                <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
                    {particles.map((p, i) => (
                        <motion.div
                            key={p.id}
                            initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                            animate={{
                                x: (Math.random() - 0.5) * 800,
                                y: (Math.random() - 0.5) * 800,
                                opacity: 0,
                                scale: 0,
                                rotate: Math.random() * 360,
                            }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute w-3 h-3 rounded-full"
                            style={{ backgroundColor: p.color }}
                        />
                    ))}
                </div>
            )}
        </AnimatePresence>
    );
}
