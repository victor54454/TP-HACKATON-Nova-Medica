'use client';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Shield } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <nav className="bg-slate-900 text-white p-4 shadow-lg border-b border-slate-800">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/dashboard" className="flex items-center gap-3 text-xl font-extrabold tracking-tight hover:text-blue-400 transition-colors">
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-inner">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <span className="hidden sm:inline italic">Nova-Médica <span className="text-blue-500 not-italic">H-Secure</span></span>
                </Link>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
                        <User className="w-4 h-4 text-blue-400" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-bold text-white">{user.username}</span>
                            <span className="text-[10px] text-blue-300 font-black uppercase tracking-[0.1em]">{user.role}</span>
                        </div>
                    </div>
                    {user.role === 'admin' && (
                        <Link href="/admin" className="text-sm font-semibold hover:text-blue-400 transition border-b-2 border-transparent hover:border-blue-500 pb-0.5">Administration</Link>
                    )}
                    <button onClick={logout} className="flex items-center gap-2 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-rose-900/20 active:scale-95">
                        <LogOut className="w-4 h-4" /> Déconnexion
                    </button>
                </div>
            </div>
        </nav>
    );
}