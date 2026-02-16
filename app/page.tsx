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
      {/* Animated Background Elements */}
      <motion.div
        animate={{
          x: [0, 50, -50, 0],
          y: [0, -50, 50, 0],
          rotate: [0, 180, 360]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 left-20 w-72 h-72 bg-purple-500/30 rounded-full blur-[100px]"
      />
      <motion.div
        animate={{
          x: [0, -30, 30, 0],
          y: [0, 30, -30, 0],
          scale: [1, 1.2, 0.9, 1]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 relative z-10 glass rounded-3xl shadow-2xl"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 mb-2 drop-shadow-lg">
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
                className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-400 focus:bg-white/10 focus:ring-1 focus:ring-indigo-400 outline-none transition-all placeholder:text-gray-500 text-white pl-12"
                placeholder="Team ID (e.g., TEAM01)"
                required
              />
              <FaUserAstronaut className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
              <div className="absolute inset-0 rounded-xl bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none blur-md -z-10" />
            </div>

            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-400 focus:bg-white/10 focus:ring-1 focus:ring-indigo-400 outline-none transition-all placeholder:text-gray-500 text-white pl-12"
                placeholder="Access Code"
                required
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors font-mono text-sm leading-none pt-0.5">●●●</div>
              <div className="absolute inset-0 rounded-xl bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none blur-md -z-10" />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-300 text-sm text-center bg-red-500/10 border border-red-500/20 py-3 rounded-lg flex items-center justify-center gap-2 overflow-hidden"
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/40 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''
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
