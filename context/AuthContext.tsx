"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    role: 'team' | 'admin';
    teamId?: string;
    quizStatus?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string, userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Decode token or fetch user from API if needed.
                    // For MVP, we can decode or just rely on the API call if we had a /me endpoint.
                    // Let's assume we persisted simple user info or fetch it.
                    // For better security/sync, let's fetch user.
                    // But our /auth/user endpoint exists. Let's use it.

                    // If admin, the /auth/user might fail if it expects Team schema.
                    // We need a way to distinguish or just try both or store role in localstorage too for initial load.

                    // Simplified: If token exists, try to get user data.
                    // Wait, we have /api/auth/user for Team. Admin doesn't have a /me endpoint yet?
                    // Let's add simple role check from token or localStorage.

                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    }
                } catch (error) {
                    console.error("Auth check failed", error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };
        checkUser();
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        if (userData.role === 'admin') router.push('/admin');
        else router.push('/quiz');
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        router.push('/');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
