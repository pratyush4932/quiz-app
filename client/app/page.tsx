"use client";

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { FaUserAstronaut, FaLock } from 'react-icons/fa';

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
          {/* Decorative compass icon */}
          <div className="text-5xl mb-3" style={{ filter: 'sepia(1) saturate(2) hue-rotate(0deg)' }}>🧭</div>
          <h1 className="text-5xl font-extrabold mb-2 drop-shadow-sm" style={{ color: 'var(--primary-start)', fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
            Quiz Portal
          </h1>
          <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--ink-faded)' }}>Participant Login</p>
          <div className="mt-3 mx-auto w-24 h-0.5" style={{ background: 'linear-gradient(to right, transparent, var(--primary-start), transparent)' }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-5 py-4 rounded-xl outline-none transition-all pl-12 parchment-input"
                style={{
                  background: 'rgba(250, 243, 224, 0.5)',
                  border: '1px solid rgba(139, 69, 19, 0.3)',
                  color: 'var(--ink)',
                  fontFamily: 'Georgia, serif',
                }}
                placeholder="Team ID (e.g., TEAM01)"
                required
              />
              <FaUserAstronaut className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--ink-faded)' }} />
            </div>

            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-xl outline-none transition-all pl-12 parchment-input"
                style={{
                  background: 'rgba(250, 243, 224, 0.5)',
                  border: '1px solid rgba(139, 69, 19, 0.3)',
                  color: 'var(--ink)',
                  fontFamily: 'Georgia, serif',
                }}
                placeholder="Access Code"
                required
              />
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--ink-faded)' }} />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-center py-3 rounded-lg flex items-center justify-center gap-2 overflow-hidden"
                style={{ background: 'rgba(139, 37, 0, 0.1)', border: '1px solid rgba(139, 37, 0, 0.25)', color: 'var(--error)' }}
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] relative overflow-hidden group ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            style={{
              background: 'linear-gradient(135deg, var(--primary-start), var(--primary-end))',
              color: '#faf3e0',
              boxShadow: '0 4px 15px rgba(139, 69, 19, 0.35)',
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.5px',
            }}
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center justify-center gap-2">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-amber-200/30 border-t-amber-100 rounded-full animate-spin" />
              ) : (
                'Begin Challenge 🗺️'
              )}
            </span>
          </button>
        </form>
      </motion.div>
    </main>
  );
}
