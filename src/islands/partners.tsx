/**
 * /partners island — hydrates the partner directory widget inside the static
 * partners.html shell, and injects the shared header/footer chrome.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../tailwind.css";
import "../index.css";
import "../chrome/mount.js";
import { api } from "../api.js";
import PartnersDirectory from "../screens/PartnersDirectory.js";

void api.initCsrf();

const mount = document.getElementById("partners-island");
if (mount) {
  createRoot(mount).render(
    <StrictMode>
      <PartnersDirectory />
    </StrictMode>,
  );
}
