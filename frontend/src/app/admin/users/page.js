
'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';

export default function UsersPage() {
  const [users] = useState([
    { id: 1, name: 'Dr Martin', role: 'MEDECIN' },
    { id: 2, name: 'Alice Dupont', role: 'ACCUEIL' }
  ]);

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="p-6">

        <h1 className="text-2xl font-bold mb-6">
          Gestion des utilisateurs
        </h1>

        <table className="w-full bg-white shadow rounded">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">Nom</th>
              <th className="p-3 text-left">Rôle</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </ProtectedRoute>
  );
}