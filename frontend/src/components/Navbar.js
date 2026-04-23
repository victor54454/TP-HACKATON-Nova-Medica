'use client';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Shield, Heart } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();

    if (!user) return null;

    const isPatient = user.role === 'patient';
    const homeHref = isPatient ? '/patient/dashboard' : (user.role === 'admin' ? '/admin' : '/dashboard');

    return (
        <nav className="glass sticky top-0 z-50 p-4 border-b border-white/5">
            <div className="container mx-auto flex justify-between items-center">
                <Link href={homeHref} className="flex items-center gap-3 text-xl font-extrabold tracking-tight hover:text-blue-400 transition-colors">
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-inner">
                        {isPatient ? <Heart className="w-6 h-6 text-white" /> : <Shield className="w-6 h-6 text-white" />}
                    </div>
                    <span className="hidden sm:inline italic">Nova Médica</span>
                </Link>

                <div className="flex items-center gap-6">
                    <Link href={isPatient ? '/patient/dashboard' : '/profile'} className="flex items-center gap-3 bg-white hover:bg-slate-50 px-4 py-2 rounded-full border border-slate-200 shadow-sm transition-all active:scale-95 group">
                        <User className="w-4 h-4 text-indigo-600 group-hover:text-indigo-700 transition-colors" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-bold text-slate-900">{user.username}</span>
                            <span className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.1em]">{user.role}</span>
                        </div>
                    </Link>


                    {!isPatient && (
                        <Link href={homeHref} className="text-sm font-semibold hover:text-blue-400 transition border-b-2 border-transparent hover:border-blue-500 pb-0.5">Tableau de bord</Link>
                    )}

                    <button onClick={logout} className="flex items-center gap-2 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-rose-900/20 active:scale-95">
                        <LogOut className="w-4 h-4" /> Déconnexion
                    </button>
                </div>
            </div>
        </nav>
    );
}
