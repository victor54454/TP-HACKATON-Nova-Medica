'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { changePassword } from '@/services/api';
import { Lock, ShieldCheck } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ChangePasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { logout, user } = useAuth();
    const router = useRouter();
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!passwordRegex.test(newPassword)) {
    setError(
        "Le mot de passe doit contenir au moins 12 caractères, une majuscule, un chiffre et un caractère spécial."
    );
    return;
}

        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setIsLoading(true);
        try {
            await changePassword(newPassword);
            setSuccess(true);
            setTimeout(() => {
                router.push(user?.role === 'patient' ? '/patient/dashboard' : '/dashboard');
            }, 2000);
        } catch (err) {
            setError(err.message || 'Une erreur est survenue.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <form onSubmit={handleSubmit} className="bg-white p-10 rounded-2xl shadow-2xl border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>

                        <div className="text-center mb-8">
                            <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-emerald-100">
                                <Lock className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Changement de mot de passe</h1>
                            <p className="text-slate-500 font-medium mt-2">Mesure de sécurité obligatoire</p>
                        </div>

                        {error && (
                            <div className="bg-rose-50 text-rose-700 p-4 rounded-xl mb-6 text-sm font-bold border border-rose-200 flex items-center gap-3">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl mb-6 text-sm font-bold border border-emerald-200 flex items-center gap-3">
                                <ShieldCheck className="w-5 h-5" />
                                Mot de passe mis à jour ! Redirection...
                            </div>
                        )}

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    placeholder="Minimum 12 caractères (0-9, A-Z, @§$!...)"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none transition-all"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirmer le mot de passe</label>
                                <input
                                    type="password"
                                    placeholder="Rétaper le mot de passe"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none transition-all"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            disabled={isLoading || success}
                            className="w-full mt-10 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                        </button>
                    </form>
                </div>
            </div>
        </ProtectedRoute>
    );
}
