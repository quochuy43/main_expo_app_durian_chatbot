import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthService, User } from '@/services/authService';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, fullName: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    error: string | null;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check for existing auth on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            setIsLoading(true);
            const token = await AuthService.getToken();

            if (token) {
                const userData = await AuthService.getCurrentUser(token);
                setUser(userData);
            }
        } catch (err) {
            // If token is invalid, clear it
            await AuthService.removeToken();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            setError(null);
            setIsLoading(true);

            const response = await AuthService.login({ email, password });
            const userData = await AuthService.getCurrentUser(response.access_token);

            setUser(userData);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Đăng nhập thất bại';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (email: string, fullName: string, password: string) => {
        try {
            setError(null);
            setIsLoading(true);

            const response = await AuthService.register({
                email,
                full_name: fullName,
                password,
            });

            const userData = await AuthService.getCurrentUser(response.access_token);
            setUser(userData);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Đăng ký thất bại';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            setIsLoading(true);
            await AuthService.removeToken();
            setUser(null);
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => {
        setError(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
                error,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
