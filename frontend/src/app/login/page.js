'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { loginUser } from '@/services/api';
import { ShieldAlert } from 'lucide-react';

/**
 * Page de connexion de l'application.
 * Gère l'authentification des praticiens.
 */
export default function LoginPage() {

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Mock

            // login("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkci5ndXlvbiIsInVzZXJuYW1lIjoiZHIuZ3V5b24iLCJyb2xlIjoiYWRtaW4ifQ.faketoken");

            // Appel API 

            const data = await loginUser(username, password);
            login(data.access_token, data.must_change_password);


        } catch (err) {
            setError('Échec de l\'authentification. Vérifiez vos accès.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-in">
                <div className="premium-card glass p-10 relative overflow-hidden">
                    {/* Subtle soft glows */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 blur-[80px]"></div>
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/5 blur-[80px]"></div>

                    <div className="text-center mb-10 relative z-10">
                        <div className="bg-indigo-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100">
                            <ShieldAlert className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h1 className="text-4xl font-black text-gradient tracking-tight">Nova Médica</h1>
                        <p className="text-slate-500 font-bold mt-2 tracking-wide uppercase text-[10px]">Portail professionnel sécurisé</p>
                    </div>

                    {/* Erreurs de connexion */}
                    {error && (
                        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl mb-8 text-sm font-bold border border-rose-200 flex items-center gap-3 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]"></div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Identifiant</label>
                            <input
                                type="text"
                                placeholder="votre identifiant"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Mot de passe</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            disabled={isLoading}
                            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-indigo-300 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Ouvrir la session
                                    <div className="w-1.5 h-1.5 rounded-full bg-white group-hover:scale-150 transition-transform shadow-[0_0_8px_white]"></div>
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-10 text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] relative z-10">
                        © 2026 Clinique Nova-Médica
                    </p>
                </div>
            </div>
        </div>
    );
}
