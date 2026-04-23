import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import "./globals.css";
import { ReactNode } from 'react';

// Métadonnées de l'application
export const metadata = {
  title: "Clinique Nova Médica",
  description: "Portail sécurisé des patients",
};

interface RootLayoutProps {
  children: ReactNode;
}

/**
 * Layout racine de l'application.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 min-h-screen text-slate-800">
        <AuthProvider>
          <Navbar />
          {/* Contenu principal des pages */}
          <main className="container mx-auto p-4 sm:p-8 animate-in">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}