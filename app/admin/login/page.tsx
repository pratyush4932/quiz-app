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
        <main className="flex min-h-screen items-center justify-center p-6 relative overflow-hidden bg-black">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 relative z-10 glass rounded-2xl shadow-2xl border border-red-900/30"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-2xl border border-red-500/30">
                        <FaUserShield />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Admin Access
                    </h1>
                    <p className="text-gray-500 text-sm">Restricted Area. Authorized Personnel Only.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-5 py-3 rounded-lg bg-black/40 border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-gray-600 text-white font-mono"
                                placeholder="Username"
                                required
                            />
                        </div>

                        <div className="relative group">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-3 rounded-lg bg-black/40 border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-gray-600 text-white font-mono"
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
                                className="text-red-400 text-xs text-center font-mono bg-red-900/20 py-2 rounded border border-red-900/50"
                            >
                                [ERROR] {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed bg-gray-800 text-gray-400' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                            }`}
                    >
                        {isLoading ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <><FaLock /> Authenticate</>}
                    </button>
                </form>
            </motion.div>
        </main>
    );
}
