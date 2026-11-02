import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera un servidor autónomo para el contenedor de Cloud Run.
  output: "standalone",
  // Argon2 es un módulo nativo: se carga tal cual, sin empaquetar.
  serverExternalPackages: ["@node-rs/argon2"],
  async headers() {
    return [
      {
        source: "/:ruta*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
