'use strict';

/* ═══════════════════════════════
   NAV — scroll state
═══════════════════════════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });


/* ═══════════════════════════════
   NAV — hamburger
═══════════════════════════════ */
const hamburger  = document.getElementById('navHamburger');
const mobileMenu = document.getElementById('navMobileMenu');
const backdrop   = document.getElementById('navBackdrop');

function openNav() {
  mobileMenu.classList.add('open');
  mobileMenu.setAttribute('aria-hidden', 'false');
  hamburger.classList.add('active');
  hamburger.setAttribute('aria-expanded', 'true');
  backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeNav() {
  mobileMenu.classList.remove('open');
  mobileMenu.setAttribute('aria-hidden', 'true');
  hamburger.classList.remove('active');
  hamburger.setAttribute('aria-expanded', 'false');
  backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

hamburger.addEventListener('click', () =>
  mobileMenu.classList.contains('open') ? closeNav() : openNav()
);
backdrop.addEventListener('click', closeNav);
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeNav();
}, { passive: true });


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
  // Store target widths, start at 0
  barFills.forEach(bar => {
    bar.dataset.target = bar.style.width;
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
  'Build Tokans', 'Legacy & Handoff', 'Employer Verified 1.6×', 'Peer Reviewed',
  'Score Decay Built In', 'No AI-Generated CVs', 'Real Work. Real Signal.',
  'Work Tokans', 'Mentor Tokans', 'Not Bought. Not Transferred.',
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

resetAuto();


/* ═══════════════════════════════
   MODAL
═══════════════════════════════ */
const modalCopy = {
  login: {
    badge: 'Coming soon',
    title: 'Login · Coming Soon',
    body:  "The login portal is being built. Join the waitlist and we'll notify you the moment it's ready.",
  },
  engineer: {
    badge: 'Founding member access',
    title: 'Sign up as an Engineer',
    body:  "Onboarding opens soon for our first cohort of verified engineers. Join the waitlist — your first Tokan task takes 8 minutes and unlocks the platform.",
  },
};

function showModal(type) {
  const overlay = document.getElementById('csOverlay');
  const copy = modalCopy[type] || modalCopy.engineer;
  document.getElementById('csBadge').textContent = copy.badge;
  document.getElementById('csTitle').textContent = copy.title;
  document.getElementById('csBody').textContent  = copy.body;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.querySelector('.cs-close').focus();
}

function closeModal(e) {
  const overlay = document.getElementById('csOverlay');
  if (!e || e.target === overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

document.querySelectorAll('[data-modal-target]').forEach(trigger => {
  trigger.addEventListener('click', e => {
    e.preventDefault();
    showModal(trigger.dataset.modalTarget);
  });
});
document.querySelectorAll('[data-modal-close]').forEach(trigger => {
  trigger.addEventListener('click', e => {
    if (trigger.dataset.modalClose === 'overlay') closeModal(e);
    else closeModal();
  });
});


/* ═══════════════════════════════
   GLOBAL KEYBOARD
═══════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeNav(); closeModal(); }
});
