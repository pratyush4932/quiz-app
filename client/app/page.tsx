"use client";

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { FaUserAstronaut } from 'react-icons/fa';

export default function Home() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { teamId: id, password });
      const { token, team } = res.data;

      const user = { ...team, role: 'team' };

      login(token, user);
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Login failed. Check Credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6 relative overflow-hidden">

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 relative z-10 glass rounded-3xl shadow-2xl"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-start to-primary-end mb-2 drop-shadow-lg filter">
            Quiz Portal
          </h1>
          <p className="text-gray-400 text-sm tracking-widest uppercase">Participant Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-black/20 border border-white/10 focus:border-primary-start focus:bg-black/40 focus:ring-1 focus:ring-primary-start outline-none transition-all placeholder:text-gray-500 text-white pl-12"
                placeholder="Team ID (e.g., TEAM01)"
                required
              />
              <FaUserAstronaut className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-start transition-colors" />
            </div>

            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-black/20 border border-white/10 focus:border-primary-start focus:bg-black/40 focus:ring-1 focus:ring-primary-start outline-none transition-all placeholder:text-gray-500 text-white pl-12"
                placeholder="Access Code"
                required
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-start transition-colors font-mono text-sm leading-none pt-0.5">●●●</div>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-white text-sm text-center bg-error/20 border border-error/40 py-3 rounded-lg flex items-center justify-center gap-2 overflow-hidden"
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] relative overflow-hidden group bg-gradient-to-r from-primary-start to-primary-end hover:brightness-110 shadow-primary-start/40 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center justify-center gap-2">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Begin Challenge 🚀'
              )}
            </span>
          </button>
        </form>
      </motion.div>
    </main>
  );
}
