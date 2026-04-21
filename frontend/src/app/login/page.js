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
    const { login } = useAuth(); //fonction de login

    /**
     * Gère la soumission du formulaire de connexion.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const data = await loginUser(username, password);
            login(data.access_token);
        } catch (err) {
            setError('Échec de l\'authentification. Vérifiez vos accès.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <form onSubmit={handleSubmit} className="bg-white p-10 rounded-2xl shadow-2xl border border-slate-200 relative overflow-hidden">
                    {/* Barre d'accentuation en haut du formulaire */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

                    <div className="text-center mb-10">
                        <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-100">
                            <ShieldAlert className="w-10 h-10 text-blue-600" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Connexion Sécurisée</h1>
                        <p className="text-slate-500 font-medium mt-2">Portail Professionnel Nova Médica</p>
                    </div>

                    {/* Erreurs de connexion */}
                    {error && (
                        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl mb-8 text-sm font-bold border border-rose-200 flex items-center gap-3 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Identifiant Praticien</label>
                            <input
                                type="text"
                                placeholder="ex: James Smith"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white outline-none transition-all font-medium text-slate-800"
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Mot de passe</label>
                            <input
                                type="password"
                                placeholder="P@ssw0rd123"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white outline-none transition-all font-medium text-slate-800"
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        disabled={isLoading}
                        className="w-full mt-10 bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? 'Vérification...' : 'Ouvrir la session'}
                    </button>

                    <p className="mt-8 text-center text-xs text-slate-400 font-medium">
                        © 2026 Clinique Nova Médica. Tous droits réservés.
                    </p>
                </form>
            </div>
        </div>
    );
}