import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supprimé 'output: export' car incompatible avec les routes dynamiques sans paramétrage complexe
  // On utilise plutôt un proxy interne via les rewrites de Next.js
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://backend:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
