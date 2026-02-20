"use client";

import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../utils/api';
import { FaUserShield, FaLock } from 'react-icons/fa';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await api.post('/auth/admin/login', { username, password });
            const { token } = res.data;

            const user = { id: 'admin', role: 'admin' as 'admin' };

            login(token, user);
        } catch (err: any) {
            setError(err.response?.data?.msg || 'Admin access denied');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center p-6 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 relative z-10 glass rounded-2xl shadow-2xl"
                style={{ border: '1px solid rgba(139, 37, 0, 0.35)' }}
            >
                <div className="text-center mb-8">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
                        style={{
                            background: 'rgba(139, 37, 0, 0.12)',
                            border: '1px solid rgba(139, 37, 0, 0.3)',
                            color: 'var(--error)',
                        }}
                    >
                        <FaUserShield />
                    </div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                        Admin Access
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--ink-faded)' }}>Restricted Area. Authorized Personnel Only.</p>
                    <div className="mt-3 mx-auto w-24 h-0.5" style={{ background: 'linear-gradient(to right, transparent, rgba(139,37,0,0.5), transparent)' }} />
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-5 py-3 rounded-lg outline-none transition-all font-mono"
                                style={{
                                    background: 'rgba(250, 243, 224, 0.5)',
                                    border: '1px solid rgba(139, 37, 0, 0.25)',
                                    color: 'var(--ink)',
                                }}
                                placeholder="Username"
                                required
                            />
                        </div>

                        <div className="relative group">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-3 rounded-lg outline-none transition-all font-mono"
                                style={{
                                    background: 'rgba(250, 243, 224, 0.5)',
                                    border: '1px solid rgba(139, 37, 0, 0.25)',
                                    color: 'var(--ink)',
                                }}
                                placeholder="Passkey"
                                required
                            />
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-xs text-center font-mono py-2 rounded"
                                style={{
                                    color: 'var(--error)',
                                    background: 'rgba(139, 37, 0, 0.08)',
                                    border: '1px solid rgba(139, 37, 0, 0.25)',
                                }}
                            >
                                [ERROR] {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        style={{
                            background: isLoading ? 'rgba(92, 61, 30, 0.3)' : 'linear-gradient(135deg, #8B2500, #c0392b)',
                            color: '#faf3e0',
                            boxShadow: '0 4px 15px rgba(139, 37, 0, 0.3)',
                        }}
                    >
                        {isLoading ? <div className="animate-spin w-4 h-4 border-2 border-amber-200/30 border-t-amber-100 rounded-full"></div> : <><FaLock /> Authenticate</>}
                    </button>
                </form>
            </motion.div>
        </main>
    );
}
