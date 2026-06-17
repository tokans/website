'use strict';

/* Landing-only behaviour: scroll reveal, profile-card bar animation, marquee
   and the "how it works" carousel. (The former auth modal lived here too; the
   landing now links to the static /login + /join pages instead, so it's gone.)
   The shared navbar is injected + wired by /js/chrome.js. */


/* ═══════════════════════════════
   SCROLL REVEAL
═══════════════════════════════ */
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });
revealEls.forEach(el => revealObs.observe(el));


/* ═══════════════════════════════
   PROFILE CARD — animate bars on entry
═══════════════════════════════ */
const profileCard = document.querySelector('.profile-card');
if (profileCard) {
  const barFills = profileCard.querySelectorAll('.pc-bar-fill');
  // Store target widths (from data-pct), start at 0
  barFills.forEach(bar => {
    bar.dataset.target = (bar.dataset.pct || '0') + '%';
    bar.style.width = '0%';
  });
  const cardObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        // Stagger bar animations
        barFills.forEach((bar, i) => {
          setTimeout(() => {
            bar.style.width = bar.dataset.target;
          }, 200 + i * 120);
        });
        cardObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  cardObs.observe(profileCard);
}


/* ═══════════════════════════════
   MARQUEE — build items
═══════════════════════════════ */
const marqueeItems = [
  'Privacy-Native by Design', 'Your Data, Your Device', 'No Cloud · No Telemetry',
  'Local-First Architecture', 'Encrypted Local Vault', 'LAN Sync, No Server',
  'Built on sharedCoreLib', 'Domain Experts, Verified', 'Trust-Verified Partners',
  'Not Bought. Not Transferred.', 'AI Needs Tokens. Humans Need Tokans.',
];
const track = document.getElementById('marqueeTrack');
if (track) {
  [...marqueeItems, ...marqueeItems].forEach(text => {
    const div = document.createElement('div');
    div.className = 'marquee-item';
    div.innerHTML = `<span class="dot" aria-hidden="true"></span>${text}`;
    track.appendChild(div);
  });
}


/* ═══════════════════════════════
   LIVE APPS — horizontal carousel arrows
═══════════════════════════════ */
const appsCarousel = document.getElementById('appsCarousel');
const appsPrev = document.getElementById('appsPrev');
const appsNext = document.getElementById('appsNext');
if (appsCarousel && appsPrev && appsNext) {
  // Scroll by roughly one card (card width + gap).
  const cardStep = () => {
    const card = appsCarousel.querySelector('.app-card');
    const gap = parseInt(getComputedStyle(appsCarousel).columnGap || '18', 10) || 18;
    return card ? card.getBoundingClientRect().width + gap : appsCarousel.clientWidth * 0.8;
  };
  appsPrev.addEventListener('click', () => appsCarousel.scrollBy({ left: -cardStep(), behavior: 'smooth' }));
  appsNext.addEventListener('click', () => appsCarousel.scrollBy({ left:  cardStep(), behavior: 'smooth' }));

  // Dim arrows at the scroll extremes.
  const updateAppsArrows = () => {
    const maxScroll = appsCarousel.scrollWidth - appsCarousel.clientWidth - 1;
    appsPrev.style.opacity = appsCarousel.scrollLeft <= 0 ? '0.35' : '1';
    appsNext.style.opacity = appsCarousel.scrollLeft >= maxScroll ? '0.35' : '1';
  };
  appsCarousel.addEventListener('scroll', updateAppsArrows, { passive: true });
  window.addEventListener('resize', updateAppsArrows, { passive: true });
  updateAppsArrows();
}


/* ═══════════════════════════════
   HOW IT WORKS — Carousel
═══════════════════════════════ */
const slides   = Array.from(document.querySelectorAll('.step-slide'));
const dotsWrap = document.getElementById('stepsDots');
const prevBtn  = document.getElementById('stepsPrev');
const nextBtn  = document.getElementById('stepsNext');
let current    = 0;
let autoTimer;

// Build dots
const dots = slides.map((_, i) => {
  const btn = document.createElement('button');
  btn.className = 'step-dot' + (i === 0 ? ' active' : '');
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-label', `Step ${i + 1}`);
  btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
  btn.addEventListener('click', () => goTo(i));
  if (dotsWrap) dotsWrap.appendChild(btn);
  return btn;
});

function goTo(idx) {
  slides[current].classList.remove('active');
  dots[current].classList.remove('active');
  dots[current].setAttribute('aria-selected', 'false');
  current = (idx + slides.length) % slides.length;
  slides[current].classList.add('active');
  dots[current].classList.add('active');
  dots[current].setAttribute('aria-selected', 'true');
  resetAuto();
}

function resetAuto() {
  clearInterval(autoTimer);
  autoTimer = setInterval(() => goTo(current + 1), 5500);
}

if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

// Touch swipe
const stepsTrack = document.getElementById('stepsTrack');
if (stepsTrack) {
  let startX = 0;
  stepsTrack.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  stepsTrack.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 48) goTo(dx < 0 ? current + 1 : current - 1);
  }, { passive: true });
}

// Keyboard on track
if (stepsTrack) {
  stepsTrack.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });
}

// Pause on hover
const stepsWrap = document.querySelector('.steps-wrap');
if (stepsWrap) {
  stepsWrap.addEventListener('mouseenter', () => clearInterval(autoTimer));
  stepsWrap.addEventListener('mouseleave', resetAuto);
}

if (slides.length) resetAuto();
