/* ── Nav scroll ── */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  /* ── Hamburger mobile menu ── */
  const hamburger   = document.getElementById('navHamburger');
  const mobileMenu  = document.getElementById('navMobileMenu');
  const backdrop    = document.getElementById('navBackdrop');

  function openMobileNav() {
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileNav() {
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    mobileMenu.classList.contains('open') ? closeMobileNav() : openMobileNav();
  });
  backdrop.addEventListener('click', closeMobileNav);

  // Close on link click inside mobile menu
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', closeMobileNav);
  });

  // Close mobile menu on resize to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMobileNav();
  }, { passive: true });

  /* ── Global Escape key (closes mobile nav AND modal) ── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeMobileNav(); closeModal(); }
  });

/* ── Scroll-reveal ── */
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => observer.observe(el));

  /* ── Score card animated counter + bars ── */
  function animateCount(el, target, duration) {
    let start = 0;
    const step = timestamp => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(ease * target);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const scoreCard = document.getElementById('scoreCard');
  let scoreAnimated = false;
  const scoreObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !scoreAnimated) {
        scoreAnimated = true;
        animateCount(document.getElementById('totalCount'), 620, 1600);
        document.querySelectorAll('.sc-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.pct + '%';
        });
      }
    });
  }, { threshold: 0.3 });
  scoreObs.observe(scoreCard);

  /* ── FAQ toggle icon ── */
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('toggle', () => {
      const icon = item.querySelector('summary span');
      icon.textContent = item.open ? '−' : '+';
    });
  });

  /* ── Marquee ── */
  const items = [
    'Build Tokans', 'Work Tokans', 'Mentor Tokans', 'Knowledge Tokans', 'Impact Tokans', 'Legacy Tokans',
    'Peer Verified', 'Employer Verified', 'Tokan Velocity', 'Contribution Based', 'Anti-Gaming', 'India First',
    'Not a Resume', 'Not Gamified', 'Real Work Only', 'Proven Contributor', 'High Reliability',
  ];
  const track = document.getElementById('marqueeTrack');
  const doubled = [...items, ...items];
  doubled.forEach(text => {
    const div = document.createElement('div');
    div.className = 'marquee-item';
    div.innerHTML = `<span class="dot"></span>${text}`;
    track.appendChild(div);
  });

  /* ── Coming soon modal ── */
  function showModal(type) {
    const overlay = document.getElementById('csOverlay');
    const badge   = document.getElementById('csBadge');
    const title   = document.getElementById('csTitle');
    const body    = document.getElementById('csBody');
    if (type === 'login') {
      badge.textContent = 'Coming soon';
      title.textContent = 'Login · Coming Soon';
      body.textContent = 'The login portal is being built as a separate project. Join the waitlist below and we\'ll notify you the moment it\'s ready.';
    } else {
      badge.textContent = 'Founding member access';
      title.textContent = 'Sign up · Coming Soon';
      body.textContent = 'Onboarding opens soon for our first founding cohort. We\'re locking employer design partners and founding reviewers now. Join the waitlist to be first in.';
    }
    overlay.classList.add('open');
    overlay.querySelector('.cs-box').focus();
    document.body.style.overflow = 'hidden';
  }
  function closeModal(e) {
    if (!e || e.target === document.getElementById('csOverlay')) {
      document.getElementById('csOverlay').classList.remove('open');
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
      closeModal(trigger.dataset.modalClose === 'overlay' ? e : undefined);
    });
  });
  // Escape key handled globally above (closes both mobile nav and modal)
