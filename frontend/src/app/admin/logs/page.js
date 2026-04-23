
'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/logs', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Erreur');
        const data = await response.json();
        setLogs(data.logs || []);
      } catch (err) {
        setError('Erreur lors du chargement des logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">
          Logs d'audit
        </h1>

        {loading && <p className="text-slate-500">Chargement...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <table className="w-full bg-white shadow rounded">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b hover:bg-slate-50">
                <td className="p-3 text-sm text-slate-500 whitespace-nowrap">{l.date}</td>
                <td className="p-3 text-sm font-mono">{l.message}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan="2" className="p-3 text-center text-slate-400">
                  Aucun log disponible / No logs available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedRoute>
  );
}