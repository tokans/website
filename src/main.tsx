import React, { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./App.js";
// Inject the shared footer (single source: src/chrome/chrome.ts) into the
// landing's <div data-chrome="footer">, so it matches every other page. Same
// side-effect import the island entries use.
import "./chrome/mount.js";
// Stylesheets (tailwind.css, index.css, landing.css) are loaded as render-blocking
// <link>s in index.html so the page paints styled before this bundle arrives —
// importing them here previously caused a flash of unstyled content on first load.

/* ─── Standalone mode (own pages) ───────────────────────────────────────────
   The marketing index.html is served for every path (Vercel rewrites
   /donate, /apps, /professionals, … → "/"). For those flow routes the React
   app owns the whole viewport, so if the page has no #root we hide the static
   marketing chrome and create one. "/" and "#"-anchors stay pure marketing. */
const STANDALONE_ROUTES = [
  "/donate",
  "/apps",
  "/founders",
  "/partners",
  "/join",
  "/hire",
  "/tokan-task",
  "/professionals",
  "/myWorkAssistant",
];

function isStandaloneRoute(path: string): boolean {
  return STANDALONE_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));
}

let standaloneRoot = document.getElementById("root");
if (!standaloneRoot && isStandaloneRoute(window.location.pathname)) {
  // Hide the static landing chrome (nav, main, footer …) and mount the app.
  // Inline display:none beats author CSS (e.g. `#navbar { display:flex }`),
  // which a plain [hidden] attribute would not.
  for (const el of Array.from(document.body.children)) {
    if (el.tagName !== "SCRIPT") (el as HTMLElement).style.display = "none";
  }
  standaloneRoot = document.createElement("div");
  standaloneRoot.id = "root";
  document.body.appendChild(standaloneRoot);
}

if (standaloneRoot) {
  createRoot(standaloneRoot).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

/* ─── Modal mode ─────────────────────────────────
   script.js creates #react-auth-root on demand and dispatches auth:open.
   We mount lazily on the first auth:open so this bundle has zero render
   cost on initial page load. */
function ModalAuth({ initialMode }: { initialMode: string }) {
  const [mode, setMode] = useState(initialMode);

  React.useEffect(() => {
    function onOpen(e: Event) {
      setMode((e as CustomEvent<{ type: string }>).detail.type);
    }
    function onClose() {
      setMode("");          // lets App reset its internal state
    }
    window.addEventListener("auth:open", onOpen);
    window.addEventListener("auth:close", onClose);
    return () => {
      window.removeEventListener("auth:open", onOpen);
      window.removeEventListener("auth:close", onClose);
    };
  }, []);

  return (
    <React.StrictMode>
      <App mode={mode} />
    </React.StrictMode>
  );
}

let modalRoot: Root | null = null;
window.addEventListener("auth:open", (e: Event) => {
  if (modalRoot) return;
  const mount = document.getElementById("react-auth-root");
  if (!mount) return;
  const initialMode = (e as CustomEvent<{ type: string }>).detail.type;
  modalRoot = createRoot(mount);
  modalRoot.render(<ModalAuth initialMode={initialMode} />);
});