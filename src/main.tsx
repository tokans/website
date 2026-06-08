import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";

// Single entry: the post-login React app, served from app.html at /app.
// Stylesheets (the prebuilt /css/site.css) are linked in app.html so the page
// paints styled before this bundle arrives — no CSS imports here.
//
// The unauthenticated experience (landing, auth forms, directories) is now
// static HTML in public/; this bundle only ever runs for an authenticated user
// (App redirects to /login when no session is found).
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
