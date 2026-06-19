import { defineConfig, type PluginOption } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

/**
 * Dev-only routing shim. In production Vercel serves the static public/ pages at
 * "/" and applies vercel.json (cleanUrls + rewrites). The bare `vite` dev server
 * does neither — public/ files aren't served at "/", and there's no rewrite
 * layer — so we mirror that routing here so `npm run local` matches prod.
 */
function staticRouting(): PluginOption {
  // Pre-login pretty routes → the static page that serves them.
  const rewrites: [RegExp, string][] = [
    [/^\/apps\/[^/]+\/?$/, "/app-detail.html"],
    [/^\/list-app\/?$/, "/app.html"],
    [/^\/(founders|join|hire|login|professionals)\/?$/, "/auth.html"],
    [/^\/patrons\/?$/, "/donate.html"],
    [/^\/professionals\/.+/, "/app.html"],
    [/^\/tokan-task\/?$/, "/app.html"],
    [/^\/myWorkAssistant(?:\/.*)?$/, "/app.html"],
    [/^\/app\/?$/, "/app.html"],
  ];
  return {
    name: "tokans-static-routing",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url || "/";
        const qIdx = raw.indexOf("?");
        const path = qIdx === -1 ? raw : raw.slice(0, qIdx);
        const query = qIdx === -1 ? "" : raw.slice(qIdx);

        let dest: string | null = null;
        if (path === "/") {
          dest = "/index.html";
        } else {
          for (const [re, to] of rewrites) {
            if (re.test(path)) { dest = to; break; }
          }
          // cleanUrls: a bare single-segment name → its .html (apps/donate/partners/auth/app).
          if (!dest && /^\/[A-Za-z0-9_-]+$/.test(path)) dest = `${path}.html`;
        }
        if (dest) req.url = dest + query;
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), staticRouting()],
  build: {
    rollupOptions: {
      // Single entry: the post-login React app (app.html → /app). Everything
      // pre-login (landing, auth, apps/donate/partners directories) is static
      // HTML + vanilla JS served straight from public/, not built by Vite.
      input: {
        app: resolve(__dirname, "app.html"),
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
