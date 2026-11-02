import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera un servidor autónomo para el contenedor de Cloud Run.
  output: "standalone",
};

export default nextConfig;
