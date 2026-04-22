
'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';

export default function LogsPage() {
  const [logs] = useState([
    { id: 1, user: 'Dr Martin', action: 'CONSULTATION', date: '2026-04-21' },
    { id: 2, user: 'Alice', action: 'CREATION', date: '2026-04-20' }
  ]);

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="p-6">

        <h1 className="text-2xl font-bold mb-6">
          Logs d’audit
        </h1>

        <table className="w-full bg-white shadow rounded">
          <thead>
            <tr className="border-b">
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Action</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="p-3">{l.user}</td>
                <td className="p-3">{l.action}</td>
                <td className="p-3">{l.date}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </ProtectedRoute>
  );
}