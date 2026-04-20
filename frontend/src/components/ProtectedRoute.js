'use client';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null && !localStorage.getItem('token')) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) return <div className="p-8 text-center text-slate-500">Chargement de la session sécurisée...</div>;

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 text-center mt-12 bg-red-50 border border-red-200 rounded-lg max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-red-700 mb-2">Accès Refusé</h2>
        <p className="text-red-600">Vos habilitations de sécurité ne permettent pas d'accéder à cette ressource.</p>
      </div>
    );
  }

  return children;
}