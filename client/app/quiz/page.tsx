"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';


import { motion, AnimatePresence } from 'framer-motion';

import { FaClock, FaCheckCircle, FaChevronRight, FaChevronLeft, FaFlagCheckered, FaList, FaLock, FaTimesCircle, FaBars } from 'react-icons/fa';
import Modal from '../../components/Modal';
import Toast, { ToastType } from '../../components/Toast';
import Celebration from '../../components/Celebration';

interface Question {
    _id: string;
    text: string;
    links: { label: string; url: string }[];
    difficulty: string;
    marks: number;
    maxAttempts: number;
    hints: string[];
}

interface UserState {
    attemptsUsed: number;
    isCorrect: boolean;
    isLocked: boolean;
    hintsUsed: number;
}

export default function QuizPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userState, setUserState] = useState<{ [key: string]: UserState }>({});
    const [answerText, setAnswerText] = useState('');
    const [timeLeft, setTimeLeft] = useState(20 * 60);
    const [quizStarted, setQuizStarted] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
    const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
    const [revealedHints, setRevealedHints] = useState<{ [questionId: string]: string[] }>({});
    const [liveScore, setLiveScore] = useState(0);
    const [finalScore, setFinalScore] = useState<number | null>(null);
    const [isRevealingHint, setIsRevealingHint] = useState(false);

    const showToast = (msg: string, type: ToastType = 'success') => {
        setToast({ msg, type });
    };

    const closeToast = () => setToast(null);

    const [quizInfo, setQuizInfo] = useState({ duration: 0, questionCount: 0 });

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const res = await api.get('/quiz/info');
                setQuizInfo(res.data);
            } catch (err) {
                console.error("Failed to fetch quiz info");
            }
        };
        fetchInfo();
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (quizStarted && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && quizStarted) {
            confirmFinish();
        }
    }, [quizStarted, timeLeft]);

    useEffect(() => {
        if (questions.length > 0) {
            // Reset answer text when changing questions
            setAnswerText('');
            setFeedback(null);
        }
    }, [currentQuestionIndex, questions]);

    const startQuiz = async () => {
        try {
            const res = await api.get('/quiz/start');
            setQuestions(res.data.questions);

            // Calculate Global Time Left
            const durationMs = res.data.duration * 60 * 1000;
            const startTime = new Date(res.data.startTime).getTime();
            const now = new Date().getTime();
            const elapsed = now - startTime;
            const remainingSeconds = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
            setTimeLeft(remainingSeconds);

            // Hydrate user state
            if (res.data.userState) {
                setUserState(res.data.userState);
                // Restore revealed hints per question
                const restored: { [qId: string]: string[] } = {};
                res.data.questions.forEach((q: Question) => {
                    const state = res.data.userState[q._id];
                    if (state && state.hintsUsed > 0) {
                        restored[q._id] = q.hints.slice(0, state.hintsUsed);
                    }
                });
                setRevealedHints(restored);
            }

            // Set live score
            setLiveScore(res.data.score || 0);

            setQuizStarted(true);
        } catch (err: any) {
            showToast(err.response?.data?.msg || 'Failed to start quiz', 'error');
            if (err.response?.data?.msg === 'Quiz already submitted.') {
                setTimeout(() => router.push('/'), 2000);
            }
        }
    };

    const handleAttempt = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentQ = questions[currentQuestionIndex];
        if (!currentQ || submitting) return;

        setSubmitting(true);
        try {
            const res = await api.post('/quiz/attempt', {
                questionId: currentQ._id,
                answerText: answerText
            });

            const { correct, attemptsLeft, message } = res.data;

            setUserState(prev => ({
                ...prev,
                [currentQ._id]: {
                    attemptsUsed: (currentQ.maxAttempts || 1) - attemptsLeft,
                    isCorrect: correct,
                    isLocked: correct || attemptsLeft === 0,
                    hintsUsed: prev[currentQ._id]?.hintsUsed || 0
                }
            }));

            if (correct) {
                const pts = currentQ.difficulty === 'Easy' ? 25 : currentQ.difficulty === 'Medium' ? 50 : 100;
                setLiveScore(prev => prev + pts);
            }

            setFeedback({
                msg: `${message} ${!correct && attemptsLeft > 0 ? `(${attemptsLeft} tries left)` : ''}`,
                type: correct ? 'success' : 'error'
            });

        } catch (err: any) {
            setFeedback({ msg: err.response?.data?.msg || 'Error submitting answer', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleRevealHint = async () => {
        const currentQ = questions[currentQuestionIndex];
        if (!currentQ || isRevealingHint) return;
        const alreadyRevealed = (revealedHints[currentQ._id] || []).length;
        const maxHints = currentQ.difficulty === 'Easy' ? 1 : currentQ.difficulty === 'Medium' ? 2 : 3;
        if (alreadyRevealed >= maxHints || alreadyRevealed >= currentQ.hints.length) return;

        setIsRevealingHint(true);
        try {
            const res = await api.post('/quiz/hint', {
                questionId: currentQ._id,
                hintIndex: alreadyRevealed
            });
            setRevealedHints(prev => ({
                ...prev,
                [currentQ._id]: [...(prev[currentQ._id] || []), res.data.hint]
            }));
            setLiveScore(res.data.newScore);
            setUserState(prev => ({
                ...prev,
                [currentQ._id]: { ...prev[currentQ._id], hintsUsed: res.data.hintsUsed }
            }));
            showToast('Hint revealed! −5 pts deducted.', 'info');
        } catch (err: any) {
            showToast(err.response?.data?.msg || 'Could not reveal hint', 'error');
        } finally {
            setIsRevealingHint(false);
        }
    };

    const handleFinishQuiz = async () => {
        setConfirmSubmitOpen(true);
    };

    const confirmFinish = async () => {
        setConfirmSubmitOpen(false);
        console.log("Submitting quiz...");
        try {
            const res = await api.post('/quiz/submit', {});
            console.log("Quiz submitted successfully:", res.data);
            setFinalScore(res.data.score ?? liveScore);
            setIsSubmitted(true);
        } catch (err) {
            console.error("Failed to submit quiz:", err);
            showToast('Failed to submit quiz.', 'error');
        }
    };

    const handleLogout = () => {
        router.push('/');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleJump = (index: number) => {
        setCurrentQuestionIndex(index);
        setIsSidebarOpen(false); // Close sidebar on mobile after selection
    };

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center font-mono" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif', fontSize: '1.2rem' }}>Loading Quiz...</div>;

    if (isSubmitted) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-8 glass p-12 rounded-3xl max-w-2xl w-full shadow-2xl"
                    style={{ border: '1px solid rgba(74, 124, 63, 0.4)' }}
                >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl" style={{ background: 'rgba(74,124,63,0.15)', color: 'var(--success)', border: '1px solid rgba(74,124,63,0.4)' }}>
                        <FaCheckCircle />
                    </div>
                    <h1 className="text-4xl font-black" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                        ⚓ Quest Complete!
                    </h1>
                    <p className="text-lg" style={{ color: 'var(--ink-light)' }}>
                        Well done, <span className="font-bold" style={{ color: 'var(--ink)' }}>{user?.teamId || 'Team'}</span>.<br />
                        Your answers have been sealed.
                    </p>

                    {/* Final Score */}
                    <div className="py-6 px-8 rounded-2xl" style={{ background: 'rgba(139,69,19,0.1)', border: '2px solid rgba(139,69,19,0.3)' }}>
                        <p className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ink-faded)' }}>Final Score</p>
                        <p className="text-6xl font-black" style={{ color: 'var(--primary-start)', fontFamily: 'Georgia, serif' }}>
                            {finalScore ?? liveScore}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--ink-faded)' }}>points</p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="px-10 py-3 rounded-xl font-bold text-lg transition-all mt-8"
                        style={{ background: 'rgba(139,69,19,0.12)', border: '1px solid rgba(139,69,19,0.3)', color: 'var(--ink)' }}
                    >
                        Return to Home
                    </button>
                </motion.div>

                <Toast
                    message={toast?.msg || null}
                    type={toast?.type || 'info'}
                    onClose={closeToast}
                />
            </main >
        );
    }



    // ... existing startQuiz ...

    if (!quizStarted) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-8 glass p-12 rounded-3xl max-w-2xl w-full"
                    style={{ border: '1px solid rgba(139,69,19,0.2)' }}
                >
                    <div className="text-6xl mb-2">🗺️</div>
                    <h1 className="text-5xl font-black" style={{ color: 'var(--primary-start)', fontFamily: 'Georgia, serif' }}>
                        Team {user.teamId}
                    </h1>
                    <div className="space-y-4 text-lg" style={{ color: 'var(--ink-light)' }}>
                        <p>Welcome, brave challenger! You have <span className="font-bold" style={{ color: 'var(--ink)' }}>{quizInfo.duration} minutes</span> to solve <span className="font-bold" style={{ color: 'var(--ink)' }}>{quizInfo.questionCount} questions</span>.</p>
                        <div className="flex flex-col gap-2 p-4 rounded-xl text-sm" style={{ background: 'rgba(196,124,53,0.1)', border: '1px solid rgba(139,69,19,0.15)' }}>
                            <p className="flex items-center gap-2 justify-center" style={{ color: 'var(--success)' }}>⚓ Sail Forth with Courage!</p>
                            <p style={{ color: 'var(--ink-faded)' }}>Answer all questions to the best of your ability.</p>
                        </div>
                    </div>
                    <button
                        onClick={startQuiz}
                        className="px-10 py-4 rounded-xl font-bold text-xl shadow-lg transition-all transform hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, var(--primary-start), var(--primary-end))', color: '#faf3e0', boxShadow: '0 4px 20px rgba(139,69,19,0.35)', fontFamily: 'Georgia, serif' }}
                    >
                        Begin the Quest 🧭
                    </button>
                </motion.div>

                <Toast
                    message={toast?.msg || null}
                    type={toast?.type || 'info'}
                    onClose={closeToast}
                />
            </main >
        );
    }

    const currentQ = questions[currentQuestionIndex];
    const qState = userState[currentQ?._id] || { attemptsUsed: 0, isCorrect: false, isLocked: false };
    const attemptsLeft = (currentQ?.maxAttempts || 1) - qState.attemptsUsed;

    return (
        <main className="min-h-screen flex flex-col md:flex-row relative overflow-hidden">
            <Celebration trigger={feedback?.type === 'success'} />

            {/* Sidebar Navigation (Desktop: Always visible, Mobile: Slide-over) */}
            <aside
                className={`fixed md:relative z-40 h-full w-64 backdrop-blur-xl transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
                style={{ background: 'rgba(250,243,224,0.88)', borderRight: '1px solid rgba(139,69,19,0.2)' }}
            >
                <div className="p-6 h-full flex flex-col">
                    <h2 className="text-xl font-bold mb-6 flex items-center justify-center gap-2" style={{ color: 'var(--primary-start)', fontFamily: 'Georgia, serif' }}>
                        <FaList /> Question Map
                    </h2>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                        {['Easy', 'Medium', 'Hard'].map(level => {
                            const levelQs = questions.map((q, i) => ({ ...q, index: i })).filter(q => q.difficulty === level);
                            if (levelQs.length === 0) return null;

                            return (
                                <div key={level}>
                                    <h3 className="text-xs font-bold uppercase mb-3 tracking-wider text-center" style={{ color: 'var(--ink-faded)' }}>{level}</h3>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {levelQs.map(q => {
                                            const uState = userState[q._id] || { isCorrect: false, isLocked: false };
                                            return (
                                                <button
                                                    key={q._id}
                                                    onClick={() => handleJump(q.index)}
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
                                                    style={{
                                                        outline: currentQuestionIndex === q.index ? '2px solid var(--primary-start)' : 'none',
                                                        outlineOffset: '2px',
                                                        transform: currentQuestionIndex === q.index ? 'scale(1.1)' : 'scale(1)',
                                                        background: uState.isCorrect ? 'rgba(74,124,63,0.2)' : uState.isLocked ? 'rgba(139,37,0,0.15)' : 'rgba(196,124,53,0.1)',
                                                        border: uState.isCorrect ? '1px solid rgba(74,124,63,0.5)' : uState.isLocked ? '1px solid rgba(139,37,0,0.4)' : '1px solid rgba(139,69,19,0.2)',
                                                        color: uState.isCorrect ? 'var(--success)' : uState.isLocked ? 'var(--error)' : 'var(--ink-faded)',
                                                    }}
                                                >
                                                    {q.index + 1}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(139,69,19,0.2)' }}>
                        <button onClick={handleFinishQuiz} className="w-full py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2" style={{ background: 'rgba(139,37,0,0.1)', border: '1px solid rgba(139,37,0,0.35)', color: 'var(--error)' }}>
                            <FaFlagCheckered /> Finish Quest
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Toggle */}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden fixed top-4 left-4 z-50 p-2 backdrop-blur rounded-lg" style={{ background: 'rgba(250,243,224,0.8)', border: '1px solid rgba(139,69,19,0.3)', color: 'var(--ink)' }}>
                <FaBars />
            </button>

            {/* Main Content Area */}
            <div className="flex-1 h-screen overflow-y-auto relative flex flex-col">
                {/* Header */}
                <header className="p-4 md:p-8 flex justify-end items-center gap-4">
                    {/* Live Score */}
                    <div
                        className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-lg backdrop-blur-md"
                        style={{ background: 'rgba(139,69,19,0.1)', border: '1px solid rgba(139,69,19,0.25)', color: 'var(--primary-start)' }}
                    >
                        🏆 <span className="font-mono">{liveScore}</span> <span className="text-sm font-normal" style={{ color: 'var(--ink-faded)' }}>pts</span>
                    </div>
                    {/* Timer */}
                    <div
                        className={`flex items-center gap-3 px-6 py-2 rounded-xl font-mono font-bold text-xl backdrop-blur-md ${timeLeft < 60 ? 'animate-pulse' : ''}`}
                        style={timeLeft < 60
                            ? { background: 'rgba(139,37,0,0.15)', border: '1px solid rgba(139,37,0,0.4)', color: 'var(--error)' }
                            : { background: 'rgba(250,243,224,0.7)', border: '1px solid rgba(139,69,19,0.25)', color: 'var(--primary-start)' }
                        }
                    >
                        <FaClock className={timeLeft < 60 ? 'animate-spin' : ''} />
                        {formatTime(timeLeft)}
                    </div>
                </header>

                <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestionIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="w-full"
                        >
                            <div className="glass rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden" style={{ border: '1px solid rgba(139,69,19,0.18)' }}>

                                {/* Question Header */}
                                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                    <div>
                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-2" style={{ background: 'rgba(139,69,19,0.12)', color: 'var(--primary-start)', border: '1px solid rgba(139,69,19,0.25)' }}>
                                            QUESTION {currentQuestionIndex + 1}
                                        </span>
                                        <div className="flex gap-2">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                                                background: currentQ?.difficulty === 'Easy' ? 'rgba(74,124,63,0.12)' : currentQ?.difficulty === 'Medium' ? 'rgba(196,124,53,0.12)' : 'rgba(139,37,0,0.12)',
                                                color: currentQ?.difficulty === 'Easy' ? 'var(--success)' : currentQ?.difficulty === 'Medium' ? 'var(--primary-end)' : 'var(--error)',
                                                border: currentQ?.difficulty === 'Easy' ? '1px solid rgba(74,124,63,0.3)' : currentQ?.difficulty === 'Medium' ? '1px solid rgba(196,124,53,0.3)' : '1px solid rgba(139,37,0,0.3)',
                                            }}>
                                                {currentQ?.difficulty}
                                            </span>
                                            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(139,69,19,0.1)', color: 'var(--primary-start)', border: '1px solid rgba(139,69,19,0.2)' }}>
                                                {currentQ?.marks} Marks
                                            </span>
                                            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                                                background: qState.attemptsUsed < (currentQ?.maxAttempts || 1) ? 'rgba(107,58,42,0.1)' : 'rgba(139,37,0,0.1)',
                                                color: qState.attemptsUsed < (currentQ?.maxAttempts || 1) ? 'var(--accent)' : 'var(--error)',
                                                border: qState.attemptsUsed < (currentQ?.maxAttempts || 1) ? '1px solid rgba(107,58,42,0.25)' : '1px solid rgba(139,37,0,0.3)',
                                            }}>
                                                attempts: {qState.attemptsUsed} / {currentQ?.maxAttempts || 1}
                                            </span>
                                        </div>
                                    </div>

                                    {qState.isCorrect && <div className="font-bold flex items-center gap-2" style={{ color: 'var(--success)' }}><FaCheckCircle /> Solved</div>}
                                    {qState.isLocked && !qState.isCorrect && <div className="font-bold flex items-center gap-2" style={{ color: 'var(--error)' }}><FaLock /> Locked</div>}
                                </div>

                                <div
                                    className="custom-scrollbar mb-8"
                                    style={{
                                        maxHeight: '220px',
                                        overflowY: 'auto',
                                        overflowX: 'auto',
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        background: 'rgba(196,124,53,0.06)',
                                        border: '1px solid rgba(139,69,19,0.15)',
                                    }}
                                >
                                    <h3 className="text-base md:text-lg font-semibold leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif', minWidth: 'max-content' }}>
                                        {currentQ?.text}
                                    </h3>
                                </div>

                                {currentQ?.links?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-5">
                                        {currentQ.links.map((link, i) => (
                                            <a
                                                key={i}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 active:scale-95"
                                                style={{ background: 'rgba(196,124,53,0.12)', border: '1px solid rgba(196,124,53,0.35)', color: 'var(--primary-end)', fontFamily: 'Georgia, serif' }}
                                            >
                                                🔗 {link.label || ''}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Interaction Area */}
                                <form onSubmit={handleAttempt} className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={qState.isLocked ? (qState.isCorrect ? 'Correct Answer Submitted' : 'Attempts Exhausted') : answerText}
                                            onChange={(e) => setAnswerText(e.target.value)}
                                            disabled={qState.isLocked || submitting}
                                            className="w-full rounded-xl p-5 text-xl outline-none transition-all shadow-inner"
                                            style={{
                                                background: qState.isCorrect ? 'rgba(74,124,63,0.08)' : qState.isLocked ? 'rgba(139,37,0,0.06)' : 'rgba(250,243,224,0.5)',
                                                border: qState.isCorrect ? '1px solid rgba(74,124,63,0.5)' : qState.isLocked ? '1px solid rgba(139,37,0,0.4)' : '1px solid rgba(139,69,19,0.25)',
                                                color: qState.isCorrect ? 'var(--success)' : qState.isLocked ? 'var(--error)' : 'var(--ink)',
                                                fontFamily: 'Georgia, serif',
                                            }}
                                            placeholder={qState.isLocked ? "" : "Type your answer here..."}
                                            autoFocus={!qState.isLocked}
                                        />
                                        {qState.isLocked && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">
                                                {qState.isCorrect ? <FaCheckCircle className="text-success" /> : <FaLock className="text-error" />}
                                            </div>
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {feedback && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="p-3 rounded-lg text-sm font-bold flex items-center gap-2"
                                                style={feedback.type === 'success' ? { background: 'rgba(74,124,63,0.15)', color: 'var(--success)', border: '1px solid rgba(74,124,63,0.3)' } : { background: 'rgba(139,37,0,0.1)', color: 'var(--error)', border: '1px solid rgba(139,37,0,0.25)' }}
                                            >
                                                {feedback.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
                                                {feedback.msg}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Hints Section */}
                                    {currentQ?.hints?.length > 0 && (() => {
                                        const revealed = revealedHints[currentQ._id] || [];
                                        const maxHints = currentQ.difficulty === 'Easy' ? 1 : currentQ.difficulty === 'Medium' ? 2 : 3;
                                        const availableHints = Math.min(maxHints, currentQ.hints.length);
                                        const canRevealMore = revealed.length < availableHints && !qState.isCorrect;
                                        return (
                                            <div className="space-y-2">
                                                {/* Already revealed hints */}
                                                {revealed.map((hint, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, y: -6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="flex items-start gap-2 p-3 rounded-lg text-sm"
                                                        style={{ background: 'rgba(196,124,53,0.12)', border: '1px solid rgba(196,124,53,0.3)', color: 'var(--ink)' }}
                                                    >
                                                        <span className="text-base flex-shrink-0">💡</span>
                                                        <span><span className="font-bold" style={{ color: 'var(--primary-end)' }}>Hint {i + 1}:</span> {hint}</span>
                                                    </motion.div>
                                                ))}
                                                {/* Reveal button */}
                                                {canRevealMore && (
                                                    <button
                                                        type="button"
                                                        onClick={handleRevealHint}
                                                        disabled={isRevealingHint}
                                                        className="w-full py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                                        style={{ background: 'rgba(196,124,53,0.1)', border: '1px dashed rgba(196,124,53,0.5)', color: 'var(--primary-end)' }}
                                                    >
                                                        {isRevealingHint
                                                            ? '⏳ Revealing...'
                                                            : `💡 Reveal Hint ${revealed.length + 1}/${availableHints} · −${(revealed.length + 1) * 5} pts`}
                                                    </button>
                                                )}
                                                {!canRevealMore && revealed.length > 0 && !qState.isCorrect && (
                                                    <p className="text-xs text-center" style={{ color: 'var(--ink-faded)' }}>All hints revealed</p>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {!qState.isLocked && (
                                        <button
                                            type="submit"
                                            disabled={submitting || !answerText.trim()}
                                            className="w-full py-4 rounded-xl font-bold text-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ background: 'linear-gradient(135deg, var(--primary-start), var(--primary-end))', color: '#faf3e0', boxShadow: '0 4px 15px rgba(139,69,19,0.3)', fontFamily: 'Georgia, serif' }}
                                        >
                                            {submitting ? '⏳ Verifying...' : '📜 Submit Answer'}
                                        </button>
                                    )}
                                </form>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between w-full mt-8">
                        <button
                            onClick={handlePrev}
                            disabled={currentQuestionIndex === 0}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--ink)', background: 'rgba(196,124,53,0.1)', border: '1px solid rgba(139,69,19,0.2)' }}
                        >
                            <FaChevronLeft /> Prev
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentQuestionIndex === questions.length - 1}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--ink)', background: 'rgba(196,124,53,0.1)', border: '1px solid rgba(139,69,19,0.2)' }}
                        >
                            Next <FaChevronRight />
                        </button>
                    </div>
                </div>
            </div>

            {/* Global UI Components */}
            <Toast
                message={toast?.msg || null}
                type={toast?.type || 'info'}
                onClose={closeToast}
            />

            <Modal
                isOpen={confirmSubmitOpen}
                onClose={() => setConfirmSubmitOpen(false)}
                title="Finish Quiz?"
                actions={
                    <>
                        <button
                            onClick={() => setConfirmSubmitOpen(false)}
                            className="px-4 py-2 rounded-lg transition-colors"
                            style={{ color: 'var(--ink-faded)', background: 'rgba(139,69,19,0.08)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmFinish}
                            className="px-4 py-2 rounded-lg font-bold transition-all shadow-lg"
                            style={{ background: 'linear-gradient(135deg, var(--success), #2d7a27)', color: '#faf3e0' }}
                        >
                            ⚓ Seal the Scroll
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <p className="text-lg" style={{ color: 'var(--ink)' }}>Are you sure you want to finalize your submission?</p>
                    <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(139,37,0,0.08)', border: '1px solid rgba(139,37,0,0.2)', color: 'var(--error)' }}>
                        ⚠️ Warning: You cannot return to the quiz after submitting. Ensure you have answered all questions.
                    </div>
                </div>
            </Modal>
        </main>
    );
}
