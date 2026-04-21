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
    birth_date: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Appel API
      // await createPatient(formData);
      // Mock
      alert("Création simulée avec succès.");
      router.push('/dashboard');
    } catch (error) {
      alert("Erreur lors de la création.");
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Nouveau Dossier Administratif</h1>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom (last_name)</label>
              <input type="text" className="w-full p-2 border rounded" required
                onChange={e => setFormData({...formData, last_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prénom (first_name)</label>
              <input type="text" className="w-full p-2 border rounded" required
                onChange={e => setFormData({...formData, first_name: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">N° Sécurité Sociale (Chiffré AES-256)</label>
            <input type="text" className="w-full p-2 border rounded font-mono" required
              onChange={e => setFormData({...formData, social_security_number: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date de naissance</label>
            <input type="date" className="w-full p-2 border rounded" required
              onChange={e => setFormData({...formData, birth_date: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Annuler</button>
            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">Créer le dossier</button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}