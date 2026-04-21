'use client';

'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

// Définir les autorisations admin ( création d’utilisateur tel que les médecins ou agent d’accueil), modifier les infos user, afficher tous les user, supprimer des users
// Logs d’audit : afficher les logs d’accès aux dossiers médicaux, avec des filtres par utilisateur, date, type d’action (consultation, modification, suppression)
//gérer les accès des praticiens et consulter les logs d'audit


export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="p-6 space-y-8">

        <h1 className="text-3xl font-bold">
          Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* USERS */}
          <Link
            href="/admin/users"
            className="bg-white p-6 rounded-xl shadow border hover:shadow-md transition"
          >
            <h2 className="text-xl font-bold">Gestion utilisateurs</h2>
            <p className="text-slate-500">
              Créer, modifier, supprimer les comptes
            </p>
          </Link>

          {/* LOGS */}
          <Link
            href="/admin/logs"
            className="bg-white p-6 rounded-xl shadow border hover:shadow-md transition"
          >
            <h2 className="text-xl font-bold">Logs d’audit</h2>
            <p className="text-slate-500">
              Suivi des actions utilisateurs
            </p>
          </Link>

        </div>

      </div>
    </ProtectedRoute>
  );
}