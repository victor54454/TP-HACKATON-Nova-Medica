'use client';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Vérification du user connecté et des droits d'accès
export default function ProtectedRoute({ children, allowedRoles = [] }) {
    const { user } = useAuth();
    const router = useRouter();

    // Redirection vers login si aucun user connecté
    useEffect(() => {
        if (user === null && !localStorage.getItem('token')) {
            router.push('/login');
        }
    }, [user, router]);

    // Message d'attente si aucun user connecté
    if (!user) return <div className="p-8 text-center text-slate-500 font-medium">Chargement de la session sécurisée...</div>;

    // Route restreinte 
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return (
            <div className="p-8 text-center mt-12 bg-rose-50 border border-rose-200 rounded-2xl max-w-lg mx-auto shadow-sm">
                <h2 className="text-xl font-black text-rose-700 mb-2 tracking-tight">Accès Refusé</h2>
                <p className="text-rose-600 font-medium">Vos habilitations de sécurité ne permettent pas d'accéder à cette ressource.</p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-6 text-sm font-bold text-rose-700 hover:underline"
                >
                    Dashboard
                </button>
            </div>
        );
    }

    
    return children;
}