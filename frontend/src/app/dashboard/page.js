'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getPatients } from '@/services/api';
import { Search, UserPlus, FileText, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Mock
    setPatients([
      { id: 1, first_name: 'Jean', last_name: 'Dupont', social_security_number: '1800175000111', last_consult: '10/04/2026' },
      { id: 2, first_name: 'Marie', last_name: 'Martin', social_security_number: '2901234567890', last_consult: '15/04/2026' }
    ]);
  }, []);

  const filteredPatients = patients.filter(p =>
    p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.social_security_number.includes(searchTerm)
  );

  return (
    <ProtectedRoute>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Recherche Patient</h1>
          <p className="text-slate-500 font-medium">Gestion des dossiers médicaux sécurisés</p>
        </div>
        <Link href="/patients/create" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/10 active:scale-95">
          <UserPlus className="w-5 h-5" /> Créer un dossier
        </Link>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-200 mb-10">
        <div className="relative group">
          <Search className="w-5 h-5 absolute left-5 top-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            placeholder="Rechercher par nom ou numéro de sécurité sociale..."
            className="w-full pl-14 p-5 bg-slate-50 border-none rounded-xl focus:ring-0 outline-none font-medium text-slate-800 placeholder:text-slate-400"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <th className="p-5">ID</th>
                <th className="p-5">PROFIL PATIENT</th>
                <th className="p-5 uppercase tracking-wider text-xs">N° Sécu</th>
                <th className="p-5 text-right">DOSSIER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="p-5 text-slate-400 font-bold">#{patient.id}</td>
                  <td className="p-5">
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-black">{patient.last_name.toUpperCase()} {patient.first_name}</span>
                      <span className="text-slate-500 text-xs mt-0.5 italic">Dernière visite: {patient.last_consult}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-md font-mono text-sm border border-slate-200">
                      {patient.social_security_number}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="inline-flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-bold transition-all group-hover:translate-x-1"
                    >
                      Consulter <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Search className="w-12 h-12 opacity-20" />
                      <p className="text-lg font-bold">Aucun patient trouvé.</p>
                      <p className="text-sm">Vérifiez l'orthographe ou créez un nouveau dossier.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
}