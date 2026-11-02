import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const titulos = Barlow_Condensed({ variable: "--font-titulos", subsets: ["latin"], weight: ["700", "800"] });
const texto = Inter({ variable: "--font-texto", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gimnasio de boxeo",
  description: "Entrena con método. Mide tu avance.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${titulos.variable} ${texto.variable} antialiased`}>{children}</body>
    </html>
  );
}
