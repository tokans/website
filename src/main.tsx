import React, { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./App.js";
import "./index.css";

/* ─── Standalone mode (own pages with #root) ─── */
const standaloneRoot = document.getElementById("root");
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