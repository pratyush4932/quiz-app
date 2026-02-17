"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

import api from '../../utils/api';
import { FaTrophy, FaEdit, FaPlus, FaSync, FaUserFriends, FaClipboardList, FaTrash, FaSave, FaTimes, FaSignOutAlt, FaKey } from 'react-icons/fa';
import Modal from '../../components/Modal';
import Toast, { ToastType } from '../../components/Toast';

interface Question {
    _id: string;
    text: string;
    image?: string;
    correctAnswer: string;
    category: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    maxAttempts?: number;
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

    // New Question Form State
    const [newQText, setNewQText] = useState('');
    const [newQImage, setNewQImage] = useState('');
    const [newQAnswer, setNewQAnswer] = useState('');
    const [newQDifficulty, setNewQDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
    const [newQMaxAttempts, setNewQMaxAttempts] = useState(1);

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

                if (remainingSeconds === 0) {
                    setTimeLeft('00:00');
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

    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingQId) {
                // Update Logic
                await api.put(`/admin/questions/${editingQId}`, {
                    text: newQText,
                    image: newQImage,
                    correctAnswer: newQAnswer,
                    difficulty: newQDifficulty,
                    maxAttempts: newQMaxAttempts
                });
                showToast('Question Updated!', 'success');
                setEditingQId(null);
            } else {
                // Create Logic
                await api.post('/admin/questions', {
                    text: newQText,
                    image: newQImage,
                    correctAnswer: newQAnswer,
                    difficulty: newQDifficulty,
                    maxAttempts: newQMaxAttempts
                });
                showToast('Question Added!', 'success');
            }
            // Reset Form
            setNewQText('');
            setNewQImage('');
            setNewQAnswer('');
            setNewQDifficulty('Medium');
            setNewQMaxAttempts(1);
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
        setNewQImage(q.image || '');
        setNewQAnswer(q.correctAnswer);
        setNewQDifficulty(q.difficulty || 'Medium');
        setNewQMaxAttempts(q.maxAttempts || 1);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
    };

    const cancelEdit = () => {
        setEditingQId(null);
        setNewQText('');
        setNewQImage('');
        setNewQAnswer('');
        setNewQDifficulty('Medium');
        setNewQMaxAttempts(1);
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

    if (loading || !user) return <div className="p-8 text-white min-h-screen flex items-center justify-center">Loading Control Panel...</div>;

    return (
        <main className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
                            <FaUserFriends className="text-emerald-400" /> Admin Dashboard
                        </h1>
                        <p className="text-sm text-gray-400 mb-4">Manage competition and view live analytics</p>

                        {/* Quiz Controls */}
                        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10 w-fit">
                            <button
                                onClick={handleToggleQuiz}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${settings.isLive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                            >
                                {settings.isLive ? 'STOP QUIZ' : 'START QUIZ'}
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 uppercase font-bold">Duration (mins)</span>
                                <input
                                    type="number"
                                    value={settings.duration}
                                    onChange={handleUpdateDuration}
                                    className="w-16 bg-black/30 border border-white/10 rounded-lg p-2 text-center text-white font-mono font-bold"
                                />
                            </div>
                            <div className="px-4 py-2 bg-black/30 rounded-lg border border-white/10 font-mono font-bold text-lg text-emerald-400 min-w-[80px] text-center">
                                {timeLeft}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-black/30 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
                            <button
                                onClick={() => setActiveTab('results')}
                                className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${activeTab === 'results' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <FaTrophy /> Leaderboard
                            </button>
                            <button
                                onClick={() => setActiveTab('questions')}
                                className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${activeTab === 'questions' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <FaEdit /> Questions
                            </button>
                            <button
                                onClick={() => setActiveTab('teams')}
                                className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${activeTab === 'teams' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <FaUserFriends /> Teams
                            </button>
                        </div>
                        <button
                            onClick={() => setChangePasswordModal(true)}
                            className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white p-3 rounded-xl border border-blue-600/30 transition-all shadow-lg"
                            title="Change Password"
                        >
                            <FaKey className="text-xl" />
                        </button>
                        <button
                            onClick={logout}
                            className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-3 rounded-xl border border-red-600/30 transition-all shadow-lg"
                            title="Logout"
                        >
                            <FaSignOutAlt className="text-xl" />
                        </button>
                    </div>
                </header>

                {activeTab === 'results' && (
                    <div className="glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h2 className="font-bold text-lg text-gray-200">Live Leaderboard (Submitted)</h2>
                            <button onClick={() => fetchData()} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm" disabled={isRefreshing}>
                                <FaSync className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-gray-400 border-b border-white/10 bg-black/20">
                                        <th className="p-4 pl-6">Rank</th>
                                        <th className="p-4">Team ID</th>
                                        <th className="p-4">Score</th>
                                        <th className="p-4 pr-6">Time Taken</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboardData.map((team, idx) => (
                                        <tr key={team.teamId} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="p-4 pl-6 font-bold text-gray-500 group-hover:text-white transition-colors">
                                                {idx === 0 ? '👑' : `#${idx + 1}`}
                                            </td>
                                            <td className="p-4 font-mono text-emerald-300 font-bold">{team.teamId}</td>
                                            <td className="p-4 font-bold text-xl">{team.score}</td>
                                            <td className="p-4 pr-6 text-gray-400 font-mono">
                                                {formatDuration(calculateDuration(team.startTime, team.endTime))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {leaderboardData.length === 0 && <div className="p-12 text-center text-gray-500">No submitted quizzes yet.</div>}
                    </div>
                )}

                {activeTab === 'questions' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form */}
                        <div className="glass p-6 rounded-2xl shadow-xl h-fit border border-white/10 sticky top-4">
                            <h3 className="text-xl font-bold mb-6 text-blue-300 flex items-center gap-2">
                                {editingQId ? <><FaEdit className="text-sm" /> Edit Question</> : <><FaPlus className="text-sm" /> Add New Question</>}
                            </h3>
                            <form onSubmit={handleAddQuestion} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Question Text</label>
                                    <textarea
                                        value={newQText}
                                        onChange={e => setNewQText(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 focus:border-blue-500 focus:bg-black/50 outline-none transition-all text-sm"
                                        rows={4}
                                        placeholder="Enter question here..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Image URL (Optional)</label>
                                    <input
                                        type="text"
                                        value={newQImage}
                                        onChange={e => setNewQImage(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 focus:border-blue-500 focus:bg-black/50 outline-none transition-all text-sm mb-2"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    {newQImage && (
                                        <div className="w-full h-32 rounded-lg bg-black/50 overflow-hidden border border-white/10">
                                            <img src={newQImage} alt="Preview" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Difficulty</label>
                                    <select
                                        value={newQDifficulty}
                                        onChange={e => setNewQDifficulty(e.target.value as any)}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 focus:border-blue-500 focus:bg-black/50 outline-none transition-all text-sm text-gray-300"
                                    >
                                        <option value="Easy">Easy (25 pts)</option>
                                        <option value="Medium">Medium (50 pts)</option>
                                        <option value="Hard">Hard (100 pts)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Correct Answer</label>
                                    <input
                                        type="text"
                                        value={newQAnswer}
                                        onChange={e => setNewQAnswer(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 focus:border-green-500 focus:bg-black/50 outline-none transition-all text-sm font-bold text-green-400"
                                        placeholder="Enter correct answer..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Max Attempts</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newQMaxAttempts}
                                        onChange={e => setNewQMaxAttempts(parseInt(e.target.value))}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 focus:border-purple-500 focus:bg-black/50 outline-none transition-all text-sm text-gray-300 font-mono"
                                    />
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button type="submit" className={`flex-1 ${editingQId ? 'bg-gradient-to-r from-yellow-600 to-orange-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} hover:opacity-90 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2`}>
                                        {editingQId ? <><FaSave /> Update</> : <><FaPlus /> Create</>}
                                    </button>
                                    {editingQId && (
                                        <button type="button" onClick={cancelEdit} className="bg-gray-700 hover:bg-gray-600 text-white px-4 rounded-xl font-bold transition-all">
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* List */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-bold text-gray-300 flex items-center gap-2">
                                    <FaClipboardList /> Library ({questions.length})
                                </h3>
                            </div>
                            {questions.map((q, idx) => (
                                <div key={q._id} className={`glass p-5 rounded-xl border hover:border-white/20 transition-all group relative ${editingQId === q._id ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/5'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="font-mono text-xs text-blue-400 font-bold">Q{idx + 1}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${q.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                q.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>{q.difficulty || 'Medium'}</span>
                                            <span className="text-xs text-gray-500 font-mono border border-white/5 px-2 py-0.5 rounded-full">
                                                Tries: {q.maxAttempts || 1}
                                            </span>
                                            <button
                                                onClick={() => handleEditQuestion(q)}
                                                className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                                            >
                                                <FaEdit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(q._id)}
                                                className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {q.image && (
                                        <div className="mb-4 rounded-lg overflow-hidden border border-white/10 max-h-48 bg-black/50">
                                            <img src={q.image} alt="Question Image" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <p className="font-semibold mb-4 text-gray-200 text-lg leading-snug">{q.text}</p>
                                    <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
                                        <span className="text-xs text-green-500 font-bold uppercase block mb-1">Correct Answer</span>
                                        <span className="text-green-300 font-mono">{q.correctAnswer}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'teams' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="glass p-8 rounded-2xl shadow-xl border border-white/10 h-fit">
                            <h3 className="text-2xl font-bold mb-6 text-purple-300 flex items-center gap-2">
                                <FaPlus className="text-sm" /> Register New Team
                            </h3>
                            <form onSubmit={handleAddTeam} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Team ID / Username</label>
                                    <input
                                        type="text"
                                        value={newTeamId}
                                        onChange={e => setNewTeamId(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl p-4 focus:border-purple-500 focus:bg-black/50 outline-none transition-all text-lg font-mono tracking-wide"
                                        placeholder="e.g. TEAM05"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Access Password</label>
                                    <input
                                        type="text"
                                        value={newTeamPassword}
                                        onChange={e => setNewTeamPassword(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl p-4 focus:border-purple-500 focus:bg-black/50 outline-none transition-all text-lg font-mono tracking-wide"
                                        placeholder="e.g. team05_pass"
                                        required
                                    />
                                </div>

                                <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 py-4 rounded-xl font-bold shadow-lg shadow-purple-900/40 transition-all mt-4 text-lg">
                                    Generate Credentials
                                </button>
                            </form>
                        </div>

                        <div className="glass p-6 rounded-2xl shadow-xl border border-white/10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-200">All Teams Status</h3>
                                <button onClick={() => fetchData()} className="text-xs text-gray-400 hover:text-white flex items-center gap-1" disabled={isRefreshing}>
                                    <FaSync className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                                </button>
                            </div>
                            <div className="space-y-3">
                                {results.map((team) => (
                                    <div key={team.teamId} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-all group">
                                        <div className="font-mono text-lg font-bold text-purple-300">{team.teamId}</div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${team.quizStatus === 'submitted' ? 'bg-green-500/10 text-green-300 border-green-500/20' :
                                                team.quizStatus === 'in_progress' ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' :
                                                    'bg-gray-700/50 text-gray-400 border-gray-600'
                                                }`}>
                                                {team.quizStatus.replace('_', ' ')}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteTeam(team._id, team.teamId)}
                                                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Team"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {results.length === 0 && <p className="text-gray-500 text-center text-sm">No teams registered.</p>}
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
                            className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmModal.onConfirm}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow-lg"
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
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Current Password</label>
                        <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">New Password</label>
                        <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors"
                            required
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setChangePasswordModal(false)}
                            className="flex-1 py-3 rounded-lg text-gray-400 hover:bg-white/5 font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-lg"
                        >
                            Update Password
                        </button>
                    </div>
                </form>
            </Modal>
        </main >
    );
}
