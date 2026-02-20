"use client";

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

import api from '../../utils/api';
import { FaTrophy, FaEdit, FaPlus, FaSync, FaUserFriends, FaClipboardList, FaTrash, FaSave, FaTimes, FaSignOutAlt, FaKey } from 'react-icons/fa';
import Modal from '../../components/Modal';
import Toast, { ToastType } from '../../components/Toast';

interface Question {
    _id: string;
    text: string;
    links?: { label: string; url: string }[];
    correctAnswer: string;
    category: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    maxAttempts?: number;
    hints?: string[];
}

interface Settings {
    isLive: boolean;
    duration: number;
    startTime?: string;
}

interface TeamResult {
    _id: string;
    teamId: string;
    score: number;
    startTime?: string;
    endTime: string;
    quizStatus: string;
}

export default function AdminPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'questions' | 'results' | 'teams'>('results');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [results, setResults] = useState<TeamResult[]>([]);
    const [settings, setSettings] = useState<Settings>({ isLive: false, duration: 30 });
    const [timeLeft, setTimeLeft] = useState<string>('--:--');
    // Track previous ranks for ↑/↓ animation indicator
    const previousRanksRef = useRef<Record<string, number>>({});

    // New Question Form State
    const [newQText, setNewQText] = useState('');
    const [newQImage, setNewQImage] = useState('');
    const [newQAnswer, setNewQAnswer] = useState('');
    const [newQDifficulty, setNewQDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
    const [newQMaxAttempts, setNewQMaxAttempts] = useState(1);
    const [newQHints, setNewQHints] = useState<string[]>(['', '']);
    const [newQLinks, setNewQLinks] = useState<{ label: string; url: string }[]>([]);

    // Edit Question State
    const [editingQId, setEditingQId] = useState<string | null>(null);

    // New Team Form State
    const [newTeamId, setNewTeamId] = useState('');
    const [newTeamPassword, setNewTeamPassword] = useState('');

    // UI State
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [changePasswordModal, setChangePasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const showToast = (msg: string, type: ToastType = 'success') => {
        setToast({ msg, type });
    };

    const closeToast = () => setToast(null);

    const openConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({ isOpen: true, title, message, onConfirm });
    };

    const closeConfirm = () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        if (!loading) {
            if (!user || user.role !== 'admin') {
                router.push('/');
            } else {
                fetchData();
            }
        }
    }, [user, loading, router]);

    // Timer Logic for Admin
    useEffect(() => {
        if (settings.isLive && settings.startTime) {
            const interval = setInterval(() => {
                const durationMs = settings.duration * 60 * 1000;
                const startTime = new Date(settings.startTime!).getTime();
                const now = new Date().getTime();
                const elapsed = now - startTime;
                const remainingSeconds = Math.max(0, Math.floor((durationMs - elapsed) / 1000));

                if (remainingSeconds <= 0) {
                    setTimeLeft('00:00');
                    if (settings.isLive) {
                        api.put('/admin/settings', { isLive: false })
                            .then(res => {
                                setSettings(res.data);
                                showToast('Time Up! Quiz Auto-Stopped.', 'info');
                            })
                            .catch(() => showToast('Failed to auto-stop quiz', 'error'));
                    }
                    clearInterval(interval);
                } else {
                    const m = Math.floor(remainingSeconds / 60);
                    const s = remainingSeconds % 60;
                    setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
                }
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setTimeLeft('--:--');
        }
    }, [settings]);

    const fetchData = async () => {
        setIsRefreshing(true);
        try {
            const timestamp = new Date().getTime();
            const qRes = await api.get(`/admin/questions?_t=${timestamp}`);
            setQuestions(qRes.data);
            const rRes = await api.get(`/admin/results?_t=${timestamp}`);
            setResults(rRes.data);
            const sRes = await api.get(`/admin/settings?_t=${timestamp}`);
            setSettings(sRes.data);
        } catch (err) {
            console.error("Failed to fetch admin data", err);
        } finally {
            setTimeout(() => setIsRefreshing(false), 500); // Minimum spin time for visual feedback
        }
    };

    // Lightweight results-only refresh (for leaderboard auto-update)
    const fetchResults = async () => {
        try {
            const rRes = await api.get('/admin/results');
            setResults(rRes.data);
        } catch (err) {
            // Silently fail — don't disrupt UI for background poll
        }
    };

    // Auto-refresh leaderboard every 30s, only while quiz is live
    useEffect(() => {
        if (!settings.isLive) return;
        const pollInterval = setInterval(fetchResults, 30000);
        return () => clearInterval(pollInterval);
    }, [settings.isLive]);

    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        const maxHints = newQDifficulty === 'Easy' ? 1 : newQDifficulty === 'Medium' ? 2 : 3;
        const hints = newQHints.slice(0, maxHints).filter(h => h.trim() !== '');
        const links = newQLinks.filter(l => l.url.trim() !== '');
        try {
            if (editingQId) {
                await api.put(`/admin/questions/${editingQId}`, {
                    text: newQText,
                    links,
                    correctAnswer: newQAnswer,
                    difficulty: newQDifficulty,
                    maxAttempts: newQMaxAttempts,
                    hints
                });
                showToast('Question Updated!', 'success');
                setEditingQId(null);
            } else {
                await api.post('/admin/questions', {
                    text: newQText,
                    links,
                    correctAnswer: newQAnswer,
                    difficulty: newQDifficulty,
                    maxAttempts: newQMaxAttempts,
                    hints
                });
                showToast('Question Added!', 'success');
            }
            setNewQText('');
            setNewQAnswer('');
            setNewQDifficulty('Medium');
            setNewQMaxAttempts(1);
            setNewQHints(['', '']);
            setNewQLinks([]);
            fetchData();
        } catch (err) {
            showToast('Failed to save question', 'error');
        }
    };

    const handleDeleteQuestion = (id: string) => {
        openConfirm('Delete Question', 'Are you sure you want to delete this question? This cannot be undone.', async () => {
            try {
                await api.delete(`/admin/questions/${id}`);
                showToast('Question deleted successfully', 'success');
                fetchData();
            } catch (err) {
                showToast('Failed to delete question', 'error');
            }
            closeConfirm();
        });
    };

    const handleEditQuestion = (q: Question) => {
        setEditingQId(q._id);
        setNewQText(q.text);
        setNewQLinks(q.links || []);
        setNewQAnswer(q.correctAnswer);
        setNewQDifficulty(q.difficulty || 'Medium');
        setNewQMaxAttempts(q.maxAttempts || 1);
        const h = q.hints || [];
        setNewQHints([h[0] || '', h[1] || '', h[2] || '']);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingQId(null);
        setNewQText('');
        setNewQLinks([]);
        setNewQAnswer('');
        setNewQDifficulty('Medium');
        setNewQMaxAttempts(1);
        setNewQHints(['', '']);
    };

    const handleToggleQuiz = async () => {
        try {
            const res = await api.put('/admin/settings', { isLive: !settings.isLive });
            setSettings(res.data);
            showToast(res.data.isLive ? 'Quiz Started!' : 'Quiz Stopped!', 'info');
        } catch (err) {
            showToast('Failed to update quiz status', 'error');
        }
    };

    const handleUpdateDuration = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const dur = parseInt(e.target.value);
        if (dur > 0) {
            try {
                const res = await api.put('/admin/settings', { duration: dur });
                setSettings(res.data);
            } catch (err) {
                console.error('Failed to update duration');
            }
        }
    };

    const handleAddTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/admin/teams', {
                teamId: newTeamId,
                password: newTeamPassword
            });
            showToast(`Team ${newTeamId} Created Successfully!`, 'success');
            setNewTeamId('');
            setNewTeamPassword('');
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.msg || 'Failed to create team', 'error');
        }
    };

    const handleDeleteTeam = (id: string, teamId: string) => {
        openConfirm('Delete Team', `Are you sure you want to delete Team ${teamId}? This action cannot be undone.`, async () => {
            try {
                await api.delete(`/admin/teams/${id}`);
                showToast('Team deleted successfully', 'success');
                fetchData();
            } catch (err) {
                showToast('Failed to delete team', 'error');
            }
            closeConfirm();
        });

    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }
        try {
            await api.put('/auth/admin/update-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            showToast('Password Updated Successfully', 'success');
            setChangePasswordModal(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            showToast(err.response?.data?.msg || 'Failed to update password', 'error');
        }
    };

    const calculateDuration = (start?: string, end?: string) => {
        if (!start || !end) return 0;
        return new Date(end).getTime() - new Date(start).getTime();
    };

    const formatDuration = (ms: number) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

        const pad = (num: number) => num.toString().padStart(2, '0');

        if (hours > 0) {
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${pad(minutes)}:${pad(seconds)}`;
    };

    // Filter results for leaderboard: Only show submitted teams
    const leaderboardData = results
        .filter(r => r.quizStatus === 'submitted')
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const durationA = calculateDuration(a.startTime, a.endTime);
            const durationB = calculateDuration(b.startTime, b.endTime);
            return durationA - durationB;
        });

    if (loading || !user) return <div className="p-8 min-h-screen flex items-center justify-center" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif', fontSize: '1.2rem' }}>Loading Control Panel...</div>;

    return (
        <main className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                            <FaUserFriends style={{ color: 'var(--primary-start)' }} /> Admin Dashboard
                        </h1>
                        <p className="text-sm mb-4" style={{ color: 'var(--ink-faded)' }}>Manage competition and view live analytics</p>

                        {/* Quiz Controls */}
                        <div className="flex items-center gap-4 p-3 rounded-xl w-fit" style={{ background: 'rgba(196, 124, 53, 0.1)', border: '1px solid rgba(139, 69, 19, 0.2)' }}>
                            <button
                                onClick={handleToggleQuiz}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all`}
                                style={settings.isLive
                                    ? { background: 'var(--error)', color: '#faf3e0' }
                                    : { background: 'var(--success)', color: '#faf3e0' }
                                }
                            >
                                {settings.isLive ? 'STOP QUIZ' : 'START QUIZ'}
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-xs uppercase font-bold" style={{ color: 'var(--ink-faded)' }}>Duration (mins)</span>
                                <input
                                    type="number"
                                    value={settings.duration}
                                    onChange={handleUpdateDuration}
                                    className="w-16 rounded-lg p-2 text-center font-mono font-bold outline-none"
                                    style={{ background: 'rgba(250, 243, 224, 0.6)', border: '1px solid rgba(139, 69, 19, 0.3)', color: 'var(--ink)' }}
                                />
                            </div>
                            <div className="px-4 py-2 rounded-lg font-mono font-bold text-lg min-w-[80px] text-center" style={{ background: 'rgba(250, 243, 224, 0.6)', border: '1px solid rgba(139, 69, 19, 0.25)', color: 'var(--primary-start)' }}>
                                {timeLeft}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex p-1.5 rounded-xl backdrop-blur-md" style={{ background: 'rgba(250, 243, 224, 0.5)', border: '1px solid rgba(139, 69, 19, 0.2)' }}>
                            <button
                                onClick={() => setActiveTab('results')}
                                className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2`}
                                style={activeTab === 'results'
                                    ? { background: 'var(--success)', color: '#faf3e0', boxShadow: '0 2px 8px rgba(74,124,63,0.3)' }
                                    : { color: 'var(--ink-faded)' }
                                }
                            >
                                <FaTrophy /> Leaderboard
                            </button>
                            <button
                                onClick={() => setActiveTab('questions')}
                                className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2`}
                                style={activeTab === 'questions'
                                    ? { background: 'var(--primary-start)', color: '#faf3e0', boxShadow: '0 2px 8px rgba(139,69,19,0.3)' }
                                    : { color: 'var(--ink-faded)' }
                                }
                            >
                                <FaEdit /> Questions
                            </button>
                            <button
                                onClick={() => setActiveTab('teams')}
                                className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2`}
                                style={activeTab === 'teams'
                                    ? { background: 'var(--accent)', color: '#faf3e0', boxShadow: '0 2px 8px rgba(107,58,42,0.3)' }
                                    : { color: 'var(--ink-faded)' }
                                }
                            >
                                <FaUserFriends /> Teams
                            </button>
                        </div>
                        <button
                            onClick={() => setChangePasswordModal(true)}
                            className="p-3 rounded-xl transition-all shadow-lg"
                            style={{ background: 'rgba(139, 69, 19, 0.12)', color: 'var(--primary-start)', border: '1px solid rgba(139, 69, 19, 0.3)' }}
                            title="Change Password"
                        >
                            <FaKey className="text-xl" />
                        </button>
                        <button
                            onClick={logout}
                            className="p-3 rounded-xl transition-all shadow-lg"
                            style={{ background: 'rgba(139, 37, 0, 0.1)', color: 'var(--error)', border: '1px solid rgba(139, 37, 0, 0.3)' }}
                            title="Logout"
                        >
                            <FaSignOutAlt className="text-xl" />
                        </button>
                    </div>
                </header>

                {activeTab === 'results' && (
                    <div className="glass rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(139, 69, 19, 0.2)' }}>
                        <div className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(139, 69, 19, 0.15)', background: 'rgba(196, 124, 53, 0.08)' }}>
                            <div className="flex items-center gap-3">
                                <h2 className="font-bold text-lg" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>Leaderboard</h2>
                                {settings.isLive && (
                                    <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse" style={{ background: 'rgba(74,124,63,0.15)', color: 'var(--success)', border: '1px solid rgba(74,124,63,0.3)' }}>
                                        ● Live · refreshes every 30s
                                    </span>
                                )}
                            </div>
                            <button onClick={() => fetchResults()} className="transition-colors flex items-center gap-2 text-sm" style={{ color: 'var(--ink-faded)' }} disabled={isRefreshing}>
                                <FaSync className={isRefreshing ? 'animate-spin' : ''} /> Refresh now
                            </button>
                        </div>
                        {/* Animated Card Leaderboard */}
                        <div className="p-4 space-y-2">
                            {leaderboardData.length === 0 ? (
                                <div className="p-12 text-center" style={{ color: 'var(--ink-faded)' }}>
                                    No submitted quizzes yet.
                                </div>
                            ) : (() => {
                                const maxScore = leaderboardData[0]?.score || 1;
                                // Compute rank changes vs previous snapshot
                                const rankChanges: Record<string, number> = {};
                                leaderboardData.forEach((team, idx) => {
                                    const prevRank = previousRanksRef.current[team.teamId];
                                    rankChanges[team.teamId] = prevRank !== undefined ? prevRank - idx : 0;
                                });
                                // Update ref for next render
                                leaderboardData.forEach((team, idx) => {
                                    previousRanksRef.current[team.teamId] = idx;
                                });

                                const medals = ['👑', '🥈', '🥉'];
                                const rowColors = [
                                    'rgba(212,175,55,0.12)',   // gold
                                    'rgba(192,192,192,0.1)',   // silver
                                    'rgba(176,103,70,0.1)',    // bronze
                                ];
                                const borderColors = [
                                    'rgba(212,175,55,0.4)',
                                    'rgba(192,192,192,0.3)',
                                    'rgba(176,103,70,0.3)',
                                ];

                                return (
                                    <AnimatePresence>
                                        {leaderboardData.map((team, idx) => {
                                            const delta = rankChanges[team.teamId] ?? 0;
                                            const scorePercent = maxScore > 0 ? Math.round((team.score / maxScore) * 100) : 0;
                                            const isTop3 = idx < 3;

                                            return (
                                                <motion.div
                                                    key={team.teamId}
                                                    layoutId={team.teamId}
                                                    layout
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 }, duration: 0.3 }}
                                                    className="flex items-center gap-4 p-4 rounded-2xl"
                                                    style={{
                                                        background: isTop3 ? rowColors[idx] : 'rgba(196,124,53,0.05)',
                                                        border: `1px solid ${isTop3 ? borderColors[idx] : 'rgba(139,69,19,0.12)'}`,
                                                    }}
                                                >
                                                    {/* Rank */}
                                                    <div className="w-10 text-center flex-shrink-0">
                                                        <span className="text-2xl">{medals[idx] || `#${idx + 1}`}</span>
                                                    </div>

                                                    {/* Team + score bar */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="font-mono font-bold text-base truncate" style={{ color: isTop3 ? 'var(--ink)' : 'var(--primary-start)' }}>
                                                                {team.teamId}
                                                            </span>
                                                            <span className="font-black text-xl font-mono ml-2" style={{ color: 'var(--ink)' }}>
                                                                {team.score}
                                                                <span className="text-xs font-normal ml-1" style={{ color: 'var(--ink-faded)' }}>pts</span>
                                                            </span>
                                                        </div>
                                                        {/* Score bar */}
                                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(139,69,19,0.1)' }}>
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${scorePercent}%` }}
                                                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    background: isTop3
                                                                        ? ['linear-gradient(90deg,#D4AF37,#f5d060)', 'linear-gradient(90deg,#aaa,#ddd)', 'linear-gradient(90deg,#b06746,#d4926c)'][idx]
                                                                        : 'linear-gradient(90deg, var(--primary-start), var(--primary-end))'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Rank change + time */}
                                                    <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                                                        {/* Rank delta */}
                                                        <AnimatePresence mode="wait">
                                                            {delta !== 0 && (
                                                                <motion.span
                                                                    key={`${team.teamId}-${delta}`}
                                                                    initial={{ opacity: 0, y: delta > 0 ? 8 : -8 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0 }}
                                                                    transition={{ duration: 0.4 }}
                                                                    className="text-xs font-bold"
                                                                    style={{ color: delta > 0 ? 'var(--success)' : 'var(--error)' }}
                                                                >
                                                                    {delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`}
                                                                </motion.span>
                                                            )}
                                                        </AnimatePresence>
                                                        {/* Time */}
                                                        <span className="text-xs font-mono" style={{ color: 'var(--ink-faded)' }}>
                                                            ⏱ {formatDuration(calculateDuration(team.startTime, team.endTime))}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                );
                            })()}
                        </div>

                    </div>
                )}

                {activeTab === 'questions' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form */}
                        <div className="glass p-6 rounded-2xl shadow-xl h-fit sticky top-4" style={{ border: '1px solid rgba(139, 69, 19, 0.2)' }}>
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--primary-start)', fontFamily: 'Georgia, serif' }}>
                                {editingQId ? <><FaEdit className="text-sm" /> Edit Question</> : <><FaPlus className="text-sm" /> Add New Question</>}
                            </h3>
                            <form onSubmit={handleAddQuestion} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-faded)' }}>Question Text</label>
                                    <textarea
                                        value={newQText}
                                        onChange={e => setNewQText(e.target.value)}
                                        className="w-full rounded-xl p-3 outline-none transition-all text-sm"
                                        style={{ background: 'rgba(250,243,224,0.5)', border: '1px solid rgba(139,69,19,0.25)', color: 'var(--ink)' }}
                                        rows={4}
                                        placeholder="Enter question here..."
                                        required
                                    />
                                </div>
                                {/* Help Links Section */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-faded)' }}>🔗 Reference Links (Optional)</label>
                                    <p className="text-xs mb-3" style={{ color: 'var(--ink-faded)' }}>Add clickable reference links participants can open from the question</p>
                                    <div className="space-y-2 mb-2">
                                        {newQLinks.map((link, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={link.label}
                                                    onChange={e => {
                                                        const updated = [...newQLinks];
                                                        updated[i] = { ...updated[i], label: e.target.value };
                                                        setNewQLinks(updated);
                                                    }}
                                                    className="w-28 flex-shrink-0 rounded-lg p-2 outline-none text-xs font-bold"
                                                    style={{ background: 'rgba(196,124,53,0.12)', border: '1px solid rgba(196,124,53,0.35)', color: 'var(--ink)' }}
                                                    placeholder="Label"
                                                />
                                                <input
                                                    type="url"
                                                    value={link.url}
                                                    onChange={e => {
                                                        const updated = [...newQLinks];
                                                        updated[i] = { ...updated[i], url: e.target.value };
                                                        setNewQLinks(updated);
                                                    }}
                                                    className="flex-1 rounded-lg p-2 outline-none text-xs"
                                                    style={{ background: 'rgba(250,243,224,0.5)', border: '1px solid rgba(139,69,19,0.25)', color: 'var(--ink)' }}
                                                    placeholder="https://..."
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setNewQLinks(newQLinks.filter((_, j) => j !== i))}
                                                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                                                    style={{ background: 'rgba(139,37,0,0.1)', color: 'var(--error)' }}
                                                >×</button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setNewQLinks([...newQLinks, { label: '', url: '' }])}
                                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                        style={{ background: 'rgba(196,124,53,0.1)', border: '1px dashed rgba(196,124,53,0.4)', color: 'var(--primary-end)' }}
                                    >+ Add Link</button>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-faded)' }}>Difficulty</label>
                                    <select
                                        value={newQDifficulty}
                                        onChange={e => setNewQDifficulty(e.target.value as any)}
                                        className="w-full rounded-xl p-3 outline-none transition-all text-sm"
                                        style={{ background: 'rgba(250,243,224,0.5)', border: '1px solid rgba(139,69,19,0.25)', color: 'var(--ink)' }}
                                    >
                                        <option value="Easy">Easy (25 pts)</option>
                                        <option value="Medium">Medium (50 pts)</option>
                                        <option value="Hard">Hard (100 pts)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-faded)' }}>Correct Answer</label>
                                    <input
                                        type="text"
                                        value={newQAnswer}
                                        onChange={e => setNewQAnswer(e.target.value)}
                                        className="w-full rounded-xl p-3 outline-none transition-all text-sm font-bold"
                                        style={{ background: 'rgba(250,243,224,0.5)', border: '1px solid rgba(74,124,63,0.4)', color: 'var(--success)' }}
                                        placeholder="Enter correct answer..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-faded)' }}>Max Attempts</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newQMaxAttempts}
                                        onChange={e => setNewQMaxAttempts(parseInt(e.target.value))}
                                        className="w-full rounded-xl p-3 outline-none transition-all text-sm font-mono"
                                        style={{ background: 'rgba(250,243,224,0.5)', border: '1px solid rgba(139,69,19,0.25)', color: 'var(--ink)' }}
                                    />
                                </div>
                                {/* Dynamic Hint Fields */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-faded)' }}>💡 Hints</label>
                                    <p className="text-xs mb-3" style={{ color: 'var(--ink-faded)' }}>
                                        {newQDifficulty === 'Easy' ? '1 hint (Easy)' : newQDifficulty === 'Medium' ? '2 hints (Medium)' : '3 hints (Hard)'}
                                        {' · '}Hint 1: <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>−5 pts</span>
                                        {newQDifficulty !== 'Easy' && <>, Hint 2: <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>−10 pts</span></>}
                                        {newQDifficulty === 'Hard' && <>, Hint 3: <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>−15 pts</span></>}
                                    </p>
                                    <div className="space-y-2">
                                        {Array.from({ length: newQDifficulty === 'Easy' ? 1 : newQDifficulty === 'Medium' ? 2 : 3 }).map((_, i) => (
                                            <input
                                                key={i}
                                                type="text"
                                                value={newQHints[i] || ''}
                                                onChange={e => {
                                                    const updated = [...newQHints];
                                                    updated[i] = e.target.value;
                                                    setNewQHints(updated);
                                                }}
                                                className="w-full rounded-xl p-3 outline-none transition-all text-sm"
                                                style={{ background: 'rgba(250,243,224,0.5)', border: '1px solid rgba(196,124,53,0.3)', color: 'var(--ink)' }}
                                                placeholder={`Hint ${i + 1}...`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button type="submit" className="flex-1 hover:opacity-90 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2" style={{ background: editingQId ? 'linear-gradient(135deg, #c47c35, #8B4513)' : 'linear-gradient(135deg, var(--primary-start), var(--primary-end))', color: '#faf3e0' }}>
                                        {editingQId ? <><FaSave /> Update</> : <><FaPlus /> Create</>}
                                    </button>
                                    {editingQId && (
                                        <button type="button" onClick={cancelEdit} className="px-4 rounded-xl font-bold transition-all" style={{ background: 'rgba(92,61,30,0.2)', color: 'var(--ink)' }}>
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* List */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                                    <FaClipboardList /> Library ({questions.length})
                                </h3>
                            </div>
                            {questions.map((q, idx) => (
                                <div key={q._id} className="glass p-5 rounded-xl transition-all group relative" style={{ border: editingQId === q._id ? '1px solid rgba(196, 124, 53, 0.6)' : '1px solid rgba(139,69,19,0.15)' }}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--primary-start)' }}>Q{idx + 1}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: q.difficulty === 'Easy' ? 'rgba(74,124,63,0.12)' : q.difficulty === 'Medium' ? 'rgba(196,124,53,0.12)' : 'rgba(139,37,0,0.12)', color: q.difficulty === 'Easy' ? 'var(--success)' : q.difficulty === 'Medium' ? 'var(--primary-end)' : 'var(--error)', border: q.difficulty === 'Easy' ? '1px solid rgba(74,124,63,0.3)' : q.difficulty === 'Medium' ? '1px solid rgba(196,124,53,0.3)' : '1px solid rgba(139,37,0,0.3)' }}>{q.difficulty || 'Medium'}</span>
                                            <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ color: 'var(--ink-faded)', border: '1px solid rgba(139,69,19,0.15)' }}>
                                                Tries: {q.maxAttempts || 1}
                                            </span>
                                            <button
                                                onClick={() => handleEditQuestion(q)}
                                                className="p-1.5 rounded-lg transition-colors"
                                                style={{ background: 'rgba(196,124,53,0.1)', color: 'var(--ink-faded)' }}
                                            >
                                                <FaEdit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(q._id)}
                                                className="p-1.5 rounded-lg transition-colors"
                                                style={{ background: 'rgba(139,37,0,0.08)', color: 'var(--error)' }}
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="font-semibold mb-3 text-lg leading-snug" style={{ color: 'var(--ink)' }}>{q.text}</p>
                                    {q.links && q.links.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {q.links.map((link, li) => (
                                                <a
                                                    key={li}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full transition-all hover:opacity-80"
                                                    style={{ background: 'rgba(196,124,53,0.12)', border: '1px solid rgba(196,124,53,0.3)', color: 'var(--primary-end)' }}
                                                >
                                                    🔗 {link.label || ''}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    <div className="p-3 rounded-lg" style={{ background: 'rgba(74,124,63,0.1)', border: '1px solid rgba(74,124,63,0.25)' }}>
                                        <span className="text-xs font-bold uppercase block mb-1" style={{ color: 'var(--success)' }}>Correct Answer</span>
                                        <span className="font-mono" style={{ color: 'var(--success)' }}>{q.correctAnswer}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'teams' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="glass p-8 rounded-2xl shadow-xl h-fit" style={{ border: '1px solid rgba(139, 69, 19, 0.2)' }}>
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--accent)', fontFamily: 'Georgia, serif' }}>
                                <FaPlus className="text-sm" /> Register New Team
                            </h3>
                            <form onSubmit={handleAddTeam} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-faded)' }}>Team ID / Username</label>
                                    <input
                                        type="text"
                                        value={newTeamId}
                                        onChange={e => setNewTeamId(e.target.value)}
                                        className="w-full rounded-xl p-4 outline-none transition-all text-lg font-mono tracking-wide"
                                        style={{ background: 'rgba(250,243,224,0.5)', border: '1px solid rgba(139,69,19,0.25)', color: 'var(--ink)' }}
                                        placeholder="e.g. TEAM05"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-faded)' }}>Access Password</label>
                                    <input
                                        type="text"
                                        value={newTeamPassword}
                                        onChange={e => setNewTeamPassword(e.target.value)}
                                        className="w-full rounded-xl p-4 outline-none transition-all text-lg font-mono tracking-wide"
                                        style={{ background: 'rgba(250,243,224,0.5)', border: '1px solid rgba(139,69,19,0.25)', color: 'var(--ink)' }}
                                        placeholder="e.g. team05_pass"
                                        required
                                    />
                                </div>

                                <button type="submit" className="w-full py-4 rounded-xl font-bold shadow-lg transition-all mt-4 text-lg" style={{ background: 'linear-gradient(135deg, var(--accent), var(--primary-start))', color: '#faf3e0', boxShadow: '0 4px 15px rgba(107,58,42,0.3)' }}>
                                    Generate Credentials
                                </button>
                            </form>
                        </div>

                        <div className="glass p-6 rounded-2xl shadow-xl" style={{ border: '1px solid rgba(139,69,19,0.2)' }}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>All Teams Status</h3>
                                <button onClick={() => fetchData()} className="text-xs flex items-center gap-1" style={{ color: 'var(--ink-faded)' }} disabled={isRefreshing}>
                                    <FaSync className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                                </button>
                            </div>
                            <div className="space-y-3">
                                {results.map((team) => (
                                    <div key={team.teamId} className="flex items-center justify-between p-4 rounded-xl transition-all group" style={{ background: 'rgba(196,124,53,0.06)', border: '1px solid rgba(139,69,19,0.1)' }}>
                                        <div className="font-mono text-lg font-bold" style={{ color: 'var(--primary-end)' }}>{team.teamId}</div>
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold capitalize" style={{
                                                background: team.quizStatus === 'submitted' ? 'rgba(74,124,63,0.12)' : team.quizStatus === 'in_progress' ? 'rgba(196,124,53,0.12)' : 'rgba(92,61,30,0.08)',
                                                color: team.quizStatus === 'submitted' ? 'var(--success)' : team.quizStatus === 'in_progress' ? 'var(--primary-end)' : 'var(--ink-faded)',
                                                border: team.quizStatus === 'submitted' ? '1px solid rgba(74,124,63,0.3)' : team.quizStatus === 'in_progress' ? '1px solid rgba(196,124,53,0.3)' : '1px solid rgba(92,61,30,0.2)'
                                            }}>
                                                {team.quizStatus.replace('_', ' ')}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteTeam(team._id, team.teamId)}
                                                className="p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                style={{ color: 'var(--error)', background: 'rgba(139,37,0,0.08)' }}
                                                title="Delete Team"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {results.length === 0 && <p className="text-center text-sm" style={{ color: 'var(--ink-faded)' }}>No teams registered.</p>}
                            </div>
                        </div>
                    </div>
                )}


            </div >

            {/* Global UI Components */}
            <Toast
                message={toast?.msg || null}
                type={toast?.type || 'info'}
                onClose={closeToast}
            />

            <Modal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirm}
                title={confirmModal.title}
                actions={
                    <>
                        <button
                            onClick={closeConfirm}
                            className="px-4 py-2 rounded-lg transition-colors"
                            style={{ color: 'var(--ink-faded)', background: 'rgba(139,69,19,0.08)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmModal.onConfirm}
                            className="px-4 py-2 rounded-lg font-bold transition-colors shadow-lg"
                            style={{ background: 'var(--error)', color: '#faf3e0' }}
                        >
                            Confirm
                        </button>
                    </>
                }
            >
                <p>{confirmModal.message}</p>
            </Modal>

            <Modal
                isOpen={changePasswordModal}
                onClose={() => setChangePasswordModal(false)}
                title="Change Admin Password"
                actions={null}
            >
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-faded)' }}>Current Password</label>
                        <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="w-full rounded-lg p-3 outline-none transition-colors"
                            style={{ background: 'rgba(250,243,224,0.5)', border: '1px solid rgba(139,69,19,0.25)', color: 'var(--ink)' }}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-faded)' }}>New Password</label>
                        <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="w-full rounded-lg p-3 outline-none transition-colors"
                            style={{ background: 'rgba(250,243,224,0.5)', border: '1px solid rgba(139,69,19,0.25)', color: 'var(--ink)' }}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-faded)' }}>Confirm New Password</label>
                        <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full rounded-lg p-3 outline-none transition-colors"
                            style={{ background: 'rgba(250,243,224,0.5)', border: '1px solid rgba(139,69,19,0.25)', color: 'var(--ink)' }}
                            required
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setChangePasswordModal(false)}
                            className="flex-1 py-3 rounded-lg font-bold transition-colors"
                            style={{ color: 'var(--ink-faded)', background: 'rgba(139,69,19,0.08)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 rounded-lg font-bold transition-colors shadow-lg"
                            style={{ background: 'linear-gradient(135deg, var(--primary-start), var(--primary-end))', color: '#faf3e0' }}
                        >
                            Update Password
                        </button>
                    </div>
                </form>
            </Modal>
        </main >
    );
}
