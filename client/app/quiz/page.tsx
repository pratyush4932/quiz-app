"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';


import { motion, AnimatePresence } from 'framer-motion';

import { FaClock, FaCheckCircle, FaChevronRight, FaChevronLeft, FaFlagCheckered, FaList, FaLock, FaTimesCircle, FaBars } from 'react-icons/fa';
import Modal from '../../components/Modal';
import Toast, { ToastType } from '../../components/Toast';

interface Question {
    _id: string;
    text: string;
    image?: string;
    difficulty: string;
    marks: number;
    maxAttempts: number;
}

interface UserState {
    attemptsUsed: number;
    isCorrect: boolean;
    isLocked: boolean;
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

            setTimeLeft(remainingSeconds); // Set synced time

            // Hydrate user state
            if (res.data.userState) {
                setUserState(res.data.userState);
            }

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

            // Update local state
            setUserState(prev => ({
                ...prev,
                [currentQ._id]: {
                    attemptsUsed: (currentQ.maxAttempts || 1) - attemptsLeft,
                    isCorrect: correct,
                    isLocked: correct || attemptsLeft === 0
                }
            }));

            setFeedback({
                msg: `${message} ${!correct && attemptsLeft > 0 ? `(${attemptsLeft} tries left)` : ''}`,
                type: correct ? 'success' : 'error'
            });

            if (correct) {
                // Optional: Auto advance after delay?
                // setTimeout(handleNext, 1500); 
            }

        } catch (err: any) {
            setFeedback({ msg: err.response?.data?.msg || 'Error submitting answer', type: 'error' });
        } finally {
            setSubmitting(false);
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

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-white font-mono">Loading Neural Interface...</div>;

    if (isSubmitted) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-black">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-8 glass p-12 rounded-3xl max-w-2xl w-full border border-green-500/30 shadow-2xl shadow-green-900/20"
                >
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400 text-4xl border border-green-500/30">
                        <FaCheckCircle />
                    </div>
                    <h1 className="text-4xl font-black text-white">
                        Mission Complete
                    </h1>
                    <p className="text-gray-300 text-lg">
                        Good job, <span className="font-bold text-white">{user?.teamId || 'Team'}</span>.<br />
                        Your session has been finalized.
                    </p>

                    <button
                        onClick={handleLogout}
                        className="px-10 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-xl font-bold text-lg transition-all mt-8"
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
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-8 glass p-12 rounded-3xl max-w-2xl w-full border border-white/10"
                >
                    <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Team {user.teamId}
                    </h1>
                    <div className="space-y-4 text-gray-300 text-lg">
                        <p>Welcome to the Arena. You have <span className="text-white font-bold">{quizInfo.duration} minutes</span> to solve <span className="text-white font-bold">{quizInfo.questionCount} questions</span>.</p>
                        <div className="flex flex-col gap-2 bg-black/20 p-4 rounded-xl text-sm border border-white/5">
                            <p className="flex items-center gap-2 justify-center text-green-400">✅ Good Luck!</p>
                            <p>Do your best and answer all questions.</p>
                        </div>
                    </div>
                    <button
                        onClick={startQuiz}
                        className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-xl shadow-lg shadow-blue-900/40 transition-all transform hover:scale-105"
                    >
                        Initialize Quiz Sequence
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
            {/* Animated Background Elements (Copied from Login) */}
            <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
                <motion.div
                    animate={{
                        x: [0, 50, -50, 0],
                        y: [0, -50, 50, 0],
                        rotate: [0, 180, 360]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-[100px]"
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
            </div>

            {/* Sidebar Navigation (Desktop: Always visible, Mobile: Slide-over) */}
            <aside className={`fixed md:relative z-40 h-full w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 h-full flex flex-col">
                    <h2 className="text-xl font-bold mb-6 flex items-center justify-center gap-2 text-blue-400">
                        <FaList /> Question Map
                    </h2>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                        {['Easy', 'Medium', 'Hard'].map(level => {
                            const levelQs = questions.map((q, i) => ({ ...q, index: i })).filter(q => q.difficulty === level);
                            if (levelQs.length === 0) return null;

                            return (
                                <div key={level}>
                                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 tracking-wider text-center">{level}</h3>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {levelQs.map(q => {
                                            const uState = userState[q._id] || { isCorrect: false, isLocked: false };
                                            return (
                                                <button
                                                    key={q._id}
                                                    onClick={() => handleJump(q.index)}
                                                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all border
                                                        ${currentQuestionIndex === q.index ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black scale-110' : ''}
                                                        ${uState.isCorrect ? 'bg-green-500/20 border-green-500/50 text-green-400' :
                                                            uState.isLocked ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                                                'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                        }`}
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

                    <div className="mt-4 pt-4 border-t border-white/10">
                        <button onClick={handleFinishQuiz} className="w-full py-3 bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2">
                            <FaFlagCheckered /> Finish Quiz
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Toggle */}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden fixed top-4 left-4 z-50 p-2 bg-black/50 backdrop-blur rounded-lg border border-white/10">
                <FaBars />
            </button>

            {/* Main Content Area */}
            <div className="flex-1 h-screen overflow-y-auto relative flex flex-col">
                {/* Header */}
                <header className="p-4 md:p-8 flex justify-end">
                    <div className={`flex items-center gap-3 px-6 py-2 rounded-xl font-mono font-bold text-xl border backdrop-blur-md ${timeLeft < 60 ? 'bg-red-500/20 border-red-500/50 text-red-200 animate-pulse' : 'bg-white/5 border-white/10 text-emerald-300'}`}>
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
                            <div className="glass rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl relative overflow-hidden">

                                {/* Question Header */}
                                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                    <div>
                                        <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold tracking-wider mb-2 border border-blue-500/20">
                                            QUESTION {currentQuestionIndex + 1}
                                        </span>
                                        <div className="flex gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${currentQ?.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                currentQ?.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                {currentQ?.difficulty}
                                            </span>
                                            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-bold border border-blue-500/20">
                                                {currentQ?.marks} Marks
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${qState.attemptsUsed < (currentQ?.maxAttempts || 1) ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                attempts: {qState.attemptsUsed} / {currentQ?.maxAttempts || 1}
                                            </span>
                                        </div>
                                    </div>

                                    {qState.isCorrect && <div className="text-green-400 font-bold flex items-center gap-2"><FaCheckCircle /> Solved</div>}
                                    {qState.isLocked && !qState.isCorrect && <div className="text-red-400 font-bold flex items-center gap-2"><FaLock /> Locked</div>}
                                </div>

                                <h3 className="text-2xl md:text-3xl font-bold mb-8 leading-relaxed text-gray-100">
                                    {currentQ?.text}
                                </h3>

                                {currentQ?.image && (
                                    <div className="mb-8 rounded-2xl overflow-hidden border border-white/10 max-h-80 bg-black/40 flex items-center justify-center">
                                        <img src={currentQ.image} alt="Question Reference" className="max-h-80 max-w-full object-contain" />
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
                                            className={`w-full bg-white/5 border rounded-xl p-5 text-xl outline-none transition-all shadow-inner
                                                ${qState.isCorrect ? 'border-green-500/50 text-green-400' :
                                                    qState.isLocked ? 'border-red-500/50 text-red-400' :
                                                        'border-white/10 text-white focus:border-blue-500 focus:bg-white/10'}`}
                                            placeholder={qState.isLocked ? "" : "Type answer here..."}
                                            autoFocus={!qState.isLocked}
                                        />
                                        {qState.isLocked && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">
                                                {qState.isCorrect ? <FaCheckCircle className="text-green-500" /> : <FaLock className="text-red-500" />}
                                            </div>
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {feedback && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                                            >
                                                {feedback.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
                                                {feedback.msg}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {!qState.isLocked && (
                                        <button
                                            type="submit"
                                            disabled={submitting || !answerText.trim()}
                                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-xl shadow-lg shadow-blue-900/40 transition-all active:scale-95"
                                        >
                                            {submitting ? 'Verifying...' : 'Submit Answer'}
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
                            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <FaChevronLeft /> Prev
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentQuestionIndex === questions.length - 1}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
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
                            className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmFinish}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold transition-all shadow-lg"
                        >
                            Yes, Submit
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <p className="text-lg text-white">Are you sure you want to finalize your submission?</p>
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-300 text-sm">
                        ⚠️ Warning: You cannot return to the quiz after submitting. Ensure you have answered all questions to the best of your ability.
                    </div>
                </div>
            </Modal>
        </main>
    );
}
