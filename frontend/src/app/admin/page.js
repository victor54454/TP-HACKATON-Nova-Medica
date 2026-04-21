'use client';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Admin Dashboard</h1>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <p className="text-slate-600">Ici, vous pourrez gérer les accès des praticiens et consulter les logs d'audit.</p>
      </div>
    </ProtectedRoute>
  );
}