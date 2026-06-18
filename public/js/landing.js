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
   HERO PARTICIPANT CAROUSEL - rotate partner / builder / maintainer cards,
   animating each card's metric bars as it becomes active.
═══════════════════════════════ */
const profileCarousel = document.getElementById('profileCarousel');
if (profileCarousel) {
  const pSlides = Array.from(profileCarousel.querySelectorAll('.profile-slide'));
  const pDotsWrap = document.getElementById('profileDots');
  let pIdx = 0;
  let pTimer;

  // Animate a slide's metric bars from 0 to their target widths.
  const animateBars = (slide) => {
    slide.querySelectorAll('.pc-bar-fill').forEach((bar, i) => {
      bar.style.width = '0%';
      setTimeout(() => { bar.style.width = (bar.dataset.pct || '0') + '%'; }, 150 + i * 120);
    });
  };

  const pDots = pSlides.map((_, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'profile-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('role', 'tab');
    d.setAttribute('aria-label', `Profile ${i + 1} of ${pSlides.length}`);
    d.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    d.addEventListener('click', () => pGoTo(i));
    if (pDotsWrap) pDotsWrap.appendChild(d);
    return d;
  });

  function pGoTo(n) {
    pSlides[pIdx].classList.remove('active');
    pDots[pIdx] && (pDots[pIdx].classList.remove('active'), pDots[pIdx].setAttribute('aria-selected', 'false'));
    pIdx = (n + pSlides.length) % pSlides.length;
    pSlides[pIdx].classList.add('active');
    pDots[pIdx] && (pDots[pIdx].classList.add('active'), pDots[pIdx].setAttribute('aria-selected', 'true'));
    animateBars(pSlides[pIdx]);
    pResetAuto();
  }

  function pResetAuto() {
    clearInterval(pTimer);
    pTimer = setInterval(() => pGoTo(pIdx + 1), 5000);
  }

  // Pause on hover.
  profileCarousel.addEventListener('mouseenter', () => clearInterval(pTimer));
  profileCarousel.addEventListener('mouseleave', pResetAuto);

  animateBars(pSlides[0]);
  pResetAuto();
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
