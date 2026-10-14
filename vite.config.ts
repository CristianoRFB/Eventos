import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    // Local-only .test authorities exercise tenant routing without publishing.
    allowedHosts: [
      "evento-a.example.test",
      "evento-b.example.test",
      "nao-cadastrado.example.test",
    ],
  },
});
