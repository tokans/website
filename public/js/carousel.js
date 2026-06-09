/**
 * Tiny carousel "deck" used by the static directory pages (/apps, /partners).
 *
 * The deck shows one `.deck-slide` at a time so the directory fits the viewport
 * without scrolling. Inactive slides stay in the DOM (toggled via `.is-active`)
 * so they remain readable to assistive tech and to tests. Build the markup with
 * `deckHTML(slides)`, inject it, then wire it with `initDeck(rootEl)`.
 */

/** Wrap an array of slide-HTML strings into a deck with prev/next + dots. */
export function deckHTML(slides, { countLabel } = {}) {
  if (slides.length === 0) return "";
  const viewport = slides
    .map((html, i) => `<div class="deck-slide${i === 0 ? " is-active" : ""}">${html}</div>`)
    .join("");

  // A single slide needs no controls.
  if (slides.length === 1) return `<div class="deck">${viewport}</div>`;

  const dots = slides
    .map((_, i) => `<button type="button" class="deck-dot${i === 0 ? " is-active" : ""}" data-deck-dot="${i}" aria-label="Go to ${i + 1}"></button>`)
    .join("");

  return `
<div class="deck">
  ${viewport}
  <div class="deck-nav">
    <button type="button" class="carousel-btn" data-deck-prev aria-label="Previous">‹</button>
    <div class="deck-dots">${dots}</div>
    <button type="button" class="carousel-btn" data-deck-next aria-label="Next">›</button>
  </div>
  ${countLabel ? `<div class="deck-count">${countLabel}</div>` : ""}
</div>`.trim();
}

/**
 * Wire a deck. Returns `{ go, index }` so callers can drive it programmatically
 * and read the current slide (used to preserve position across re-renders).
 */
export function initDeck(root, { index = 0, onChange } = {}) {
  const slides = Array.from(root.querySelectorAll(".deck-slide"));
  const dots = Array.from(root.querySelectorAll("[data-deck-dot]"));
  if (slides.length === 0) return { go() {}, get index() { return 0; } };

  let cur = Math.min(Math.max(index, 0), slides.length - 1);

  const go = (n) => {
    cur = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("is-active", k === cur));
    dots.forEach((d, k) => d.classList.toggle("is-active", k === cur));
    onChange?.(cur);
  };

  root.querySelector("[data-deck-prev]")?.addEventListener("click", () => go(cur - 1));
  root.querySelector("[data-deck-next]")?.addEventListener("click", () => go(cur + 1));
  dots.forEach((d, k) => d.addEventListener("click", () => go(k)));

  go(cur);
  return { go, get index() { return cur; } };
}
