import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const loggedUser = await login(email, password);
            if (!loggedUser) {
                setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
                return;
            }
            navigate(loggedUser.role === 'Vendedor' ? '/portal' : '/dashboard', { replace: true });
        } catch {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-ios-bg dark:bg-black flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-md p-8 rounded-3xl animate-slide-up">

                <div className="text-center mb-8">
                    <img
                        src="https://freanpartners.com/upload/logoworlddeportes.webp"
                        alt="WORLD DEPORTES Logo"
                        className="w-20 h-20 mx-auto mb-4 object-contain"
                    />
                    <h1 className="text-2xl font-bold">WORLD DEPORTES</h1>
                    <p className="text-sm text-ios-subtext mt-1">Ingresa a tu cuenta admin</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Correo electrónico"
                            className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue focus:bg-white dark:focus:bg-black outline-none transition-all"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue focus:bg-white dark:focus:bg-black outline-none transition-all"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-ios-blue text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? 'Conectando...' : 'Iniciar Sesión'}
                    </button>


                </form>

                <div className="mt-6 text-center text-xs text-ios-subtext">
                    <p>WORLD DEPORTES © 2026</p>
                </div>
            </div>
        </div>
    );
};
