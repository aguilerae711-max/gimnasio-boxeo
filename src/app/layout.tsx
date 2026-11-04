import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { marcaDe } from "./_servidor/marca";
import "./globals.css";

// La marca sale de la base: nada se congela con los datos del momento de compilar.
export const dynamic = "force-dynamic";

const titulos = Barlow_Condensed({ variable: "--font-titulos", subsets: ["latin"], weight: ["700", "800"] });
const texto = Inter({ variable: "--font-texto", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const marca = await marcaDe();
  return {
    title: { default: marca.nombre, template: `%s · ${marca.nombre}` },
    description: [marca.eslogan, marca.lema].filter(Boolean).join(". ") || undefined,
    icons: marca.logo ? { icon: marca.logo, apple: marca.logo } : undefined,
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${titulos.variable} ${texto.variable} antialiased`}>{children}</body>
    </html>
  );
}
