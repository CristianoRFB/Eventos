import js from "@eslint/js";
import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "scaffold-eventos77/**",
      "build/**",
      ".react-router/**",
      ".wrangler/**",
      "test-results/**",
      "coverage/**",
      "public/build/**",
      "worker-configuration.d.ts",
      "migrations/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        setTimeout: "readonly",
      },
    },
  },
);
