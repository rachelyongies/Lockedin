import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable strict rules for hackathon demo
      "@typescript-eslint/no-explicit-any": "warn", // Change from error to warning
      "@typescript-eslint/no-unused-vars": "warn", // Change from error to warning
      "react-hooks/exhaustive-deps": "warn", // Change from error to warning
      "react/no-unescaped-entities": "warn", // Change from error to warning
      "@next/next/no-img-element": "warn", // Change from error to warning
      "prefer-const": "warn", // Change from error to warning
      "react-hooks/rules-of-hooks": "error", // Keep this as error for safety
    },
  },
];

export default eslintConfig;
