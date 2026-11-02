import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Regla de dependencia (arquitectura limpia): las capas internas no conocen a las externas.
const prohibido = (grupos, mensaje) => ({
  "no-restricted-imports": ["error", { patterns: [{ group: grupos, message: mensaje }] }],
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/shared/domain/**", "src/modules/*/domain/**"],
    rules: prohibido(
      ["**/application/**", "**/infrastructure/**", "@/app/**", "next", "next/*", "react", "postgres"],
      "El dominio no depende de casos de uso, infraestructura ni frameworks.",
    ),
  },
  {
    files: ["src/modules/*/application/**"],
    ignores: ["**/*.test.ts"],
    rules: prohibido(
      ["**/infrastructure/**", "@/app/**", "next", "next/*", "react", "postgres"],
      "Los casos de uso dependen solo del dominio y de sus puertos.",
    ),
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
