'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPatient } from '@/services/api';

export default function CreatePatient() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    social_security_number: '',
    birth_date: '',
    email: '',
    phone: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{15}$/.test(formData.social_security_number)) {
      setError("Le numéro de sécurité sociale doit contenir exactement 15 chiffres.");
      return;
    }
    setLoading(true);
    try {
      await createPatient(formData);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || "Erreur lors de la création du dossier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Nouveau dossier administratif</h1>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom</label>
              <input type="text" className="w-full p-2 border rounded" required
                onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prénom</label>
              <input type="text" className="w-full p-2 border rounded" required
                onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">N° Sécurité Sociale</label>
            <input type="text" className="w-full p-2 border rounded font-mono" required
              placeholder="15 chiffres — ex: 123456789012345"
              maxLength={15}
              onChange={e => setFormData({ ...formData, social_security_number: e.target.value })} />
            <p className="text-xs text-slate-400 mt-1">Exactement 15 chiffres, sans espaces.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date de naissance</label>
            <input type="date" className="w-full p-2 border rounded" required
              onChange={e => setFormData({ ...formData, birth_date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Adresse mail</label>
            <input type="email" className="w-full p-2 border rounded"
              onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Numéro de téléphone</label>
            <input type="tel" className="w-full p-2 border rounded"
              onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Adresse postale</label>
            <input type="text" className="w-full p-2 border rounded"
              onChange={e => setFormData({ ...formData, address: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Annuler</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Création...' : 'Créer le dossier'}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}