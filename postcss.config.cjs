module.exports = {
  plugins: {
    // Inline @imports BEFORE Tailwind runs, so `npm run build:css` can compile
    // src/static.css (which @imports tailwind/index/landing/chrome) into the
    // single prebuilt public/css/site.css consumed by the static pages.
    "postcss-import": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
