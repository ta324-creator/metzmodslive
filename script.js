'use strict';

// ─── Globals ────────────────────────────────────────────────────────────────
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Consolidated RAF-throttled scroll handler ───────────────────────────────
// All scroll work runs in one rAF tick — prevents 60+ redundant calls/sec.
let scrollRAF = false;
const scrollCallbacks = [];
function onScrollFrame() {
  scrollRAF = false;
  scrollCallbacks.forEach(fn => fn());
}
window.addEventListener('scroll', () => {
  if (!scrollRAF) { scrollRAF = true; requestAnimationFrame(onScrollFrame); }
}, { passive: true });
function addScrollHandler(fn) { scrollCallbacks.push(fn); }

// ─── Scroll progress bar ─────────────────────────────────────────────────────
if (!prefersReduced) {
  const prog = document.createElement('div');
  prog.id = 'scroll-progress';
  prog.setAttribute('aria-hidden', 'true');
  document.body.prepend(prog);
  addScrollHandler(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
  });
}

// ─── Mobile menu ─────────────────────────────────────────────────────────────
const openMenu    = document.getElementById('openMenu');
const closeMenu   = document.getElementById('closeMenu');
const navLinks    = document.getElementById('navLinks');
const navBackdrop = document.getElementById('navBackdrop');

function toggleMenu(open) {
  navLinks.classList.toggle('open', open);
  if (open) closeMenu.focus();
  if (navBackdrop) navBackdrop.classList.toggle('show', open);
  openMenu.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}
openMenu.addEventListener('click', () => toggleMenu(true));
closeMenu.addEventListener('click',  () => toggleMenu(false));
navLinks.querySelectorAll('a[data-nav]').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
if (navBackdrop) navBackdrop.addEventListener('click', () => toggleMenu(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(false); });

// ─── Hero image carousel ─────────────────────────────────────────────────────
const heroBgEl = document.querySelector('.hero-bg');
if (heroBgEl) {
  // Draw hero kicker line immediately (not scroll-triggered — hero is visible on load)
  document.querySelectorAll('.hero-inner .kicker').forEach(k => k.classList.add('drawn'));
  const heroSlides = heroBgEl.querySelectorAll('.hero-slide');
  const heroDots   = document.querySelectorAll('.hero-dot');
  let heroIndex    = 0;
  let heroTimer    = null;

  function showHeroSlide(i) {
    heroIndex = (i + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((s, idx) => {
      const isActive = idx === heroIndex;
      const isNext   = idx === (heroIndex + 1) % heroSlides.length;
      // Lazy-load: paint background only when the slide is about to be seen
      if ((isActive || isNext) && s.dataset.src && !s.style.backgroundImage) {
        s.style.backgroundImage = `url('${s.dataset.src}')`;
      }
      s.classList.toggle('active', isActive);
    });
    heroDots.forEach((d, idx) => {
      const isActive = idx === heroIndex;
      d.classList.toggle('active', isActive);
      d.setAttribute('aria-current', String(isActive));
      if (isActive && !prefersReduced) {
        d.style.animation = 'none';
        d.offsetHeight; // reflow to restart keyframe
        d.style.animation = '';
      }
    });
  }

  function startHeroAuto() {
    clearInterval(heroTimer);
    if (!prefersReduced) heroTimer = setInterval(() => showHeroSlide(heroIndex + 1), 5500);
  }

  // Pause when tab is hidden — resume on return
  document.addEventListener('visibilitychange', () => {
    document.hidden ? clearInterval(heroTimer) : startHeroAuto();
  });

  startHeroAuto();
  heroDots.forEach((dot, idx) => dot.addEventListener('click', () => { showHeroSlide(idx); startHeroAuto(); }));

  let heroTouchX = 0;
  heroBgEl.addEventListener('touchstart', e => { heroTouchX = e.touches[0].clientX; }, { passive: true });
  heroBgEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - heroTouchX;
    if (Math.abs(dx) > 40) { showHeroSlide(heroIndex + (dx > 0 ? -1 : 1)); startHeroAuto(); }
  }, { passive: true });
}

// ─── Gallery carousel ────────────────────────────────────────────────────────
const galleryTrack = document.getElementById('galleryTrack');
if (galleryTrack) {
  const galleryPrev = document.querySelector('.gallery-nav.prev');
  const galleryNext = document.querySelector('.gallery-nav.next');
  const galleryStep = () => (galleryTrack.querySelector('.gallery-slide')?.offsetWidth ?? 300) + 16;

  galleryPrev?.addEventListener('click', () => galleryTrack.scrollBy({ left: -galleryStep(), behavior: 'smooth' }));
  galleryNext?.addEventListener('click', () => galleryTrack.scrollBy({ left:  galleryStep(), behavior: 'smooth' }));

  // Mouse drag — AbortController cleans up global listeners after each drag
  let isDragging = false, dragStartX = 0, dragScrollStart = 0, dragMoved = false;
  galleryTrack.addEventListener('mousedown', e => {
    isDragging    = true;
    dragMoved     = false;
    dragStartX    = e.pageX;
    dragScrollStart = galleryTrack.scrollLeft;
    galleryTrack.classList.add('dragging');

    const ac = new AbortController();
    const { signal } = ac;

    window.addEventListener('mousemove', mv => {
      if (!isDragging) return;
      const dx = mv.pageX - dragStartX;
      if (Math.abs(dx) > 4) dragMoved = true;
      galleryTrack.scrollLeft = dragScrollStart - dx;
    }, { signal });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      galleryTrack.classList.remove('dragging');
      ac.abort(); // remove both listeners in one call
    }, { signal, once: true });
  });

  // Prevent accidental click after a drag
  galleryTrack.addEventListener('click', e => { if (dragMoved) e.preventDefault(); }, true);

  // ─── Lightbox ───────────────────────────────────────────────────────────
  const lightbox        = document.getElementById('lightbox');
  const lightboxImg     = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose   = document.getElementById('lightboxClose');
  const lightboxPrev    = document.getElementById('lightboxPrev');
  const lightboxNext    = document.getElementById('lightboxNext');

  const slides = [...galleryTrack.querySelectorAll('.gallery-slide')].map(slide => ({
    src:     slide.querySelector('img').getAttribute('src'),
    alt:     slide.querySelector('img').getAttribute('alt') || '',
    caption: slide.querySelector('.build-caption')?.textContent ?? ''
  }));

  let lbIndex         = 0;
  let lbLastFocus     = null; // element to return focus to on close

  // All focusable elements inside the lightbox (for focus trap)
  function getLbFocusable() {
    return [...lightbox.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )].filter(el => !el.disabled);
  }

  function renderLightbox() {
    lightboxImg.classList.remove('show');
    lightboxImg.src     = slides[lbIndex].src;
    lightboxImg.alt     = slides[lbIndex].alt;
    lightboxCaption.textContent = slides[lbIndex].caption;
    lightboxImg.onload  = () => lightboxImg.classList.add('show');
  }

  function openLightbox(i) {
    if (dragMoved) return;
    lbLastFocus = document.activeElement; // save so we can restore on close
    lbIndex     = i;
    renderLightbox();
    lightbox.hidden = false;
    requestAnimationFrame(() => {
      lightbox.classList.add('open');
      lightboxClose.focus(); // move focus inside dialog
    });
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      lightbox.hidden = true;
      lbLastFocus?.focus(); // restore focus to trigger element
    }, 300);
  }

  function stepLightbox(dir) {
    lbIndex = (lbIndex + dir + slides.length) % slides.length;
    renderLightbox();
  }

  galleryTrack.querySelectorAll('.gallery-slide').forEach(slide => {
    slide.addEventListener('click', () => openLightbox(Number(slide.dataset.lightboxIndex)));
  });

  // Keyboard access — Enter or Space opens lightbox for focused slide
  galleryTrack.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const slide = e.target.closest('.gallery-slide');
      if (slide) { e.preventDefault(); openLightbox(Number(slide.dataset.lightboxIndex)); }
    }
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click',  () => stepLightbox(-1));
  lightboxNext.addEventListener('click',  () => stepLightbox( 1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

  document.addEventListener('keydown', e => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape')     { closeLightbox(); return; }
    if (e.key === 'ArrowLeft')  { stepLightbox(-1); return; }
    if (e.key === 'ArrowRight') { stepLightbox( 1); return; }

    // Focus trap: keep Tab inside the dialog
    if (e.key === 'Tab') {
      const focusable = getLbFocusable();
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
  });

  let lbTouchX = 0;
  lightbox.addEventListener('touchstart', e => { lbTouchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - lbTouchX;
    if (Math.abs(dx) > 40) stepLightbox(dx > 0 ? -1 : 1);
  }, { passive: true });
}

// ─── Interactive gradient text ────────────────────────────────────────────────
// Mouse → gradient position on desktop. Touch drag + gyroscope on mobile.
const gradientTextEl = document.querySelector('.hero-inner .gradient-text');
if (gradientTextEl && !prefersReduced) {
  let target  = 50; // gradient position %, starts centered
  let current = 50;
  let gyroReady = false;

  // Lerp loop — runs at 60fps, smoothly chases target
  (function lerpLoop() {
    current += (target - current) * 0.08;
    gradientTextEl.style.backgroundPosition = `${current.toFixed(2)}% 50%`;
    requestAnimationFrame(lerpLoop);
  })();

  // Desktop: mouse X → gradient position
  window.addEventListener('mousemove', e => {
    target = (e.clientX / window.innerWidth) * 100;
  }, { passive: true });

  // Mobile: touch drag → gradient position
  window.addEventListener('touchmove', e => {
    target = (e.touches[0].clientX / window.innerWidth) * 100;
  }, { passive: true });

  // Gyroscope: gamma = left/right tilt (-90° to 90°)
  function handleOrientation(e) {
    if (e.gamma === null) return;
    const clamped = Math.max(-50, Math.min(50, e.gamma)); // ±50° range
    target = ((clamped + 50) / 100) * 100;
  }

  function startGyro() {
    if (gyroReady) return;
    gyroReady = true;
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      // iOS 13+ requires a user-gesture to grant permission
      DeviceOrientationEvent.requestPermission()
        .then(p => { if (p === 'granted') window.addEventListener('deviceorientation', handleOrientation); })
        .catch(() => {});
    } else {
      // Android / non-gated browsers — add listener directly
      window.addEventListener('deviceorientation', handleOrientation);
    }
  }

  // Trigger gyro on first touch (satisfies iOS user-gesture requirement)
  window.addEventListener('touchstart', startGyro, { once: true, passive: true });
  // Android doesn't need the gesture gate — try immediately
  if (typeof DeviceOrientationEvent?.requestPermission !== 'function') startGyro();
}
const header = document.getElementById('site-header');
if (header) {
  addScrollHandler(() => header.classList.toggle('scrolled', window.scrollY > 10));
}

// ─── Scroll reveal ───────────────────────────────────────────────────────────
if (prefersReduced) {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// ─── Floating book button ────────────────────────────────────────────────────
const floatBook      = document.getElementById('floatBook');
const contactSection = document.getElementById('contact');
const heroSection    = document.querySelector('.hero');
if (floatBook && contactSection && heroSection) {
  let contactInView = false;
  let floatVisible  = false;

  new IntersectionObserver(
    ([entry]) => { contactInView = entry.isIntersecting; },
    { threshold: 0.1 }
  ).observe(contactSection);

  addScrollHandler(() => {
    const shouldShow = window.scrollY > heroSection.offsetHeight * 0.8 && !contactInView;
    if (shouldShow && !floatVisible) {
      floatBook.classList.remove('hide');
      floatBook.classList.add('show');
      floatVisible = true;
    } else if (!shouldShow && floatVisible) {
      floatBook.classList.remove('show');
      floatBook.classList.add('hide');
      floatVisible = false;
      floatBook.addEventListener('animationend', () => {
        if (!floatVisible) floatBook.classList.remove('hide');
      }, { once: true });
    }
  });
}

// ─── FAQ accordion ───────────────────────────────────────────────────────────
document.querySelectorAll('.faq-trigger').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    document.getElementById(btn.getAttribute('aria-controls')).classList.toggle('open', !expanded);
    btn.closest('.faq-item').classList.toggle('open', !expanded);
  });
});

// ─── Street / Trail segmented toggle ─────────────────────────────────────────
const stToggle = document.querySelector('.st-toggle');
if (stToggle) {
  const stTabs   = stToggle.querySelectorAll('.st-tab');
  const stPanels = document.querySelectorAll('.st-panel');

  function activateStTab(target) {
    stTabs.forEach(t => {
      const active = t.dataset.target === target;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
    });
    stPanels.forEach(p => {
      const active = p.classList.contains(target);
      p.classList.toggle('active', active);
      p.setAttribute('aria-hidden', String(!active));
    });
    stToggle.classList.toggle('trail-active', target === 'trail');
  }

  stTabs.forEach(tab => {
    tab.addEventListener('click', () => activateStTab(tab.dataset.target));
    tab.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const other = [...stTabs].find(t => t !== tab);
        other.focus();
        activateStTab(other.dataset.target);
      }
    });
  });
}
