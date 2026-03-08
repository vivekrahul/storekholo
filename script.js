/* ===== Store Kholo — Script ===== */
document.addEventListener('DOMContentLoaded', () => {
  /* ---- Custom Cursor ---- */
  const cursor = document.createElement('div');
  cursor.classList.add('cursor');
  document.body.appendChild(cursor);
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });
  const interactives = 'a, button, .accordion-header, .step-num, .stage-toggle button, input, textarea';
  document.addEventListener('mouseover', e => { if (e.target.closest(interactives)) cursor.classList.add('expand'); });
  document.addEventListener('mouseout', e => { if (e.target.closest(interactives)) cursor.classList.remove('expand'); });

  /* ---- Navbar scroll ---- */
  const navbar = document.querySelector('.navbar');
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Mobile menu ---- */
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  hamburger?.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }));

  /* ---- Hero cycling word ---- */
  const words = ['Sell.', 'Scale.', 'Win.'];
  let wordIdx = 0;
  const cycleEl = document.querySelector('.cycle-word');
  if (cycleEl) {
    setInterval(() => {
      wordIdx = (wordIdx + 1) % words.length;
      const span = cycleEl.querySelector('span');
      span.style.animation = 'none';
      span.offsetHeight; // reflow
      span.textContent = words[wordIdx];
      span.style.animation = 'clipReveal .6s ease forwards';
    }, 2500);
  }

  /* ---- Count-up animation ---- */
  const counters = document.querySelectorAll('[data-count]');
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || entry.target.dataset.counted) return;
      entry.target.dataset.counted = '1';
      const target = +entry.target.dataset.count;
      const suffix = entry.target.dataset.suffix || '';
      const prefix = entry.target.dataset.prefix || '';
      const duration = 1800;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const val = Math.round(target * ease);
        entry.target.textContent = prefix + val.toLocaleString('en-IN') + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });
  counters.forEach(c => countObserver.observe(c));

  /* ---- Accordion ---- */
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.accordion-item.active').forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });

  /* ---- Steps (Section 4) — scroll reveal ---- */
  const stepNums = document.querySelectorAll('.step-num');
  const stepPanels = document.querySelectorAll('.step-panel');
  const stepLines = document.querySelectorAll('.step-line-fill');
  let highestStep = -1;
  const stepObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const idx = +entry.target.dataset.idx;
      if (entry.isIntersecting && idx > highestStep) {
        highestStep = idx;
      }
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
    // update indicator
    stepNums.forEach((n, i) => n.classList.toggle('active', i <= highestStep));
    stepLines.forEach((l, i) => { l.style.height = i < highestStep ? '100%' : '0'; });
  }, { threshold: 0.3 });
  stepPanels.forEach((p, i) => { p.dataset.idx = i; stepObs.observe(p); });

  /* ---- Stage toggle (contact form) ---- */
  document.querySelectorAll('.stage-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stage-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  /* ---- Reveal on scroll ---- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ---- Manifesto lines ---- */
  const mLines = document.querySelectorAll('.manifesto-line');
  const mObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); mObs.unobserve(e.target); }
    });
  }, { threshold: 0.2 });
  mLines.forEach((l, i) => { l.style.transitionDelay = (i * 100) + 'ms'; mObs.observe(l); });

  /* ---- Form UI-only submit ---- */
  const form = document.getElementById('contact-form');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('.form-submit');
    btn.textContent = 'SUBMITTED ✓';
    btn.style.background = '#34D399';
    setTimeout(() => { btn.textContent = 'REQUEST DISCOVERY CALL →'; btn.style.background = ''; }, 3000);
  });
});
