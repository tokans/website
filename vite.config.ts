import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Multi-page: the marketing landing plus one static shell per converted
      // route. Each shell hydrates its dynamic island; everything else is static.
      input: {
        main: resolve(__dirname, "index.html"),
        donate: resolve(__dirname, "donate.html"),
        apps: resolve(__dirname, "apps.html"),
        partners: resolve(__dirname, "partners.html"),
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
