/**
 * /donate island — hydrates the dynamic donation widget inside the static
 * donate.html shell, and injects the shared header/footer chrome.
 *
 * Everything else on the page (chrome, use-case panel, copy) is static HTML.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../tailwind.css";
import "../index.css";
import "../chrome/mount.js";
import { api } from "../api.js";
import DonateForm from "../screens/DonateForm.js";

// Prime the CSRF cookie before the checkout request.
void api.initCsrf();

const mount = document.getElementById("donate-island");
if (mount) {
  createRoot(mount).render(
    <StrictMode>
      <DonateForm />
    </StrictMode>,
  );
}
