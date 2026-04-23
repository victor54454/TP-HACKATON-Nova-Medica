'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createPatient } from '@/services/api';
import { KeyRound, User } from 'lucide-react';

export default function CreatePatient() {
  const router = useRouter();
  const { user } = useAuth();
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
  const [createdAccount, setCreatedAccount] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{15}$/.test(formData.social_security_number)) {
      setError("Le numéro de sécurité sociale doit contenir exactement 15 chiffres.");
      return;
    }
    setLoading(true);
    try {
      const result = await createPatient(formData);
      setCreatedAccount(result);
    } catch (err) {
      setError(err.message || "Erreur lors de la création du dossier.");
    } finally {
      setLoading(false);
    }
  };

  if (createdAccount) {
    return (
      <ProtectedRoute>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-emerald-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-100 p-3 rounded-full">
                <User className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Dossier créé avec succès</h1>
                <p className="text-slate-500 text-sm">Un compte patient a été automatiquement généré.</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-black text-amber-800 flex items-center gap-2 mb-4">
                <KeyRound className="w-5 h-5" /> Identifiants du compte patient
              </h2>
              <p className="text-sm text-amber-700 mb-4 font-medium">
                Transmettez ces informations au patient. Le mot de passe temporaire ne sera plus affiché après cette page.
              </p>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Patient</p>
                  <p className="font-black text-slate-900 text-lg">{createdAccount.last_name?.toUpperCase()} {createdAccount.first_name}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Identifiant de connexion</p>
                  <p className="font-mono font-bold text-slate-900 text-lg">{createdAccount.patient_username}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Mot de passe temporaire</p>
                  <p className="font-mono font-bold text-slate-900 text-lg tracking-widest">{createdAccount.temp_password}</p>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-4 font-medium">
                Le patient devra changer ce mot de passe lors de sa première connexion.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-black font-bold transition-all"
              >
                Retour au dashboard
              </button>
              <button
                onClick={() => { setCreatedAccount(null); setFormData({ first_name:'',last_name:'',social_security_number:'',birth_date:'',email:'',phone:'',address:'' }); }}
                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all"
              >
                Nouveau dossier
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

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

          {user?.role === 'praticien' && (
            <div>
              <label className="block text-sm font-medium mb-1">Pathologie (optionnel)</label>
              <textarea className="w-full p-2 border rounded" rows={2}
                onChange={e => setFormData({ ...formData, pathology: e.target.value })} />
            </div>
          )}

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
