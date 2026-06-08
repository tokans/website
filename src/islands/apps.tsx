/**
 * /apps island — hydrates the apps directory widget inside the static apps.html
 * shell, and injects the shared header/footer chrome.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../tailwind.css";
import "../index.css";
import "../chrome/mount.js";
import { api } from "../api.js";
import AppsDirectory from "../screens/AppsDirectory.js";

void api.initCsrf();

const mount = document.getElementById("apps-island");
if (mount) {
  createRoot(mount).render(
    <StrictMode>
      <AppsDirectory />
    </StrictMode>,
  );
}
