import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    AppUser,
    findUserByCredentials,
    loadSession,
    saveSession,
    clearSession,
    initializeStore,
} from '../services/localStore';

// Re-export for convenience
export type { AppUser };
export type Role = AppUser['role'];

interface AuthContextType {
    user: AppUser | null;
    login: (email: string, password: string) => AppUser | null;
    logout: () => void;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isVendedor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AppUser | null>(null);

    // On mount: initialize seed data if first time, then restore session
    useEffect(() => {
        initializeStore();
        const session = loadSession();
        if (session) setUser(session);
    }, []);

    const login = (email: string, password: string): AppUser | null => {
        const found = findUserByCredentials(email, password);
        if (!found) return null;
        setUser(found);
        saveSession(found);
        return found;
    };

    const logout = () => {
        setUser(null);
        clearSession();
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isAuthenticated: !!user,
            isAdmin: user?.role === 'Admin' || user?.role === 'Supervisor',
            isVendedor: user?.role === 'Vendedor',
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
