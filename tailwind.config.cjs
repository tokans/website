/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan static HTML shells, the landing page, and all React islands/screens.
  content: ["./*.html", "./pages/**/*.html", "./src/**/*.{ts,tsx}"],
  // Preflight stays OFF so Tailwind coexists with the bespoke landing widgets
  // (carousels, marquee, profile card) in public/styles.css and the existing
  // screen CSS while markup migrates to utilities. Shared resets live in the
  // @layer base block of src/tailwind.css instead.
  corePlugins: { preflight: false },
  theme: {
    container: { center: true, padding: "var(--container-pad)" },
    extend: {
      // All colours resolve to the CSS variables defined in src/tailwind.css
      // :root — the single source of truth shared by static HTML + React.
      colors: {
        bg: {
          DEFAULT: "var(--bg)",
          alt: "var(--bg-alt)",
          subtle: "var(--bg-subtle)",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
        },
        sky: {
          DEFAULT: "var(--sky)",
          dark: "var(--sky-dark)",
          light: "var(--sky-light)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          light: "var(--amber-light)",
        },
        verified: "var(--verified)",
        warning: "var(--warning)",
        border: "var(--border)",
      },
      fontFamily: {
        sans: ["DM Sans", "Helvetica Neue", "system-ui", "sans-serif"],
        display: ["Syne", "Helvetica Neue", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        mono: ["DM Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        btn: "var(--btn-radius)",
        card: "var(--card-radius)",
        lg: "var(--card-radius)",
        md: "calc(var(--card-radius) - 6px)",
        sm: "calc(var(--card-radius) - 10px)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      maxWidth: {
        container: "var(--container-max)",
      },
    },
  },
  plugins: [],
};
