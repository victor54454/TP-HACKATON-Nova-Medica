import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import "./globals.css";
import { ReactNode } from 'react'; 

export const metadata = {
  title: "H-Secure - Clinique Nova-Médica",
  description: "Portail sécurisé des patients",
};


interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 min-h-screen text-slate-800">
        <AuthProvider>
          <Navbar />
          <main className="container mx-auto p-4 sm:p-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}