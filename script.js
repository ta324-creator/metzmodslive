// Respect reduced-motion preference (declared first — used by multiple blocks below)
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Mobile menu
const openMenu = document.getElementById('openMenu');
const closeMenu = document.getElementById('closeMenu');
const navLinks = document.getElementById('navLinks');
const navBackdrop = document.getElementById('navBackdrop');
function toggleMenu(open){
  if(open){
    navLinks.style.display = 'flex';
    navLinks.offsetHeight; // force reflow so the browser registers the pre-transition state
    navLinks.classList.add('open');
  } else {
    navLinks.classList.remove('open');
  }
  if(navBackdrop) navBackdrop.classList.toggle('show', open);
  openMenu.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}
navLinks.addEventListener('transitionend', e => {
  if(e.propertyName === 'transform' && !navLinks.classList.contains('open')){
    navLinks.style.display = 'none';
  }
});
openMenu.addEventListener('click', () => toggleMenu(true));
closeMenu.addEventListener('click', () => toggleMenu(false));
navLinks.querySelectorAll('a[data-nav]').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
if(navBackdrop) navBackdrop.addEventListener('click', () => toggleMenu(false));
document.addEventListener('keydown', e => { if(e.key === 'Escape') toggleMenu(false); });

// Hero image carousel: auto-advance, tappable dots, swipe gesture
const heroBgEl = document.querySelector('.hero-bg');
if(heroBgEl){
  const heroSlides = heroBgEl.querySelectorAll('.hero-slide');
  const heroDots = document.querySelectorAll('.hero-dot');
  let heroIndex = 0;
  let heroTimer = null;
  function showHeroSlide(i){
    heroIndex = (i + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((s, idx) => s.classList.toggle('active', idx === heroIndex));
    heroDots.forEach((d, idx) => {
      d.classList.toggle('active', idx === heroIndex);
      // Reset the progress animation by forcing a reflow
      if(idx === heroIndex && !prefersReduced){
        d.style.animation = 'none';
        d.offsetHeight; // trigger reflow
        d.style.animation = '';
      }
    });
  }
  function startHeroAuto(){
    clearInterval(heroTimer);
    if(!prefersReduced){
      heroTimer = setInterval(() => showHeroSlide(heroIndex + 1), 5500);
    }
  }
  // Draw the first kicker line immediately since it's in the hero (not in a .reveal)
  document.querySelectorAll('.hero-anim .kicker::before, .hero-inner .kicker').forEach(k => k.classList.add('drawn'));
  startHeroAuto();
  heroDots.forEach((dot, idx) => dot.addEventListener('click', () => { showHeroSlide(idx); startHeroAuto(); }));
  let heroTouchX = 0;
  heroBgEl.addEventListener('touchstart', e => { heroTouchX = e.touches[0].clientX; }, { passive:true });
  heroBgEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - heroTouchX;
    if(Math.abs(dx) > 40){
      showHeroSlide(heroIndex + (dx > 0 ? -1 : 1));
      startHeroAuto();
    }
  }, { passive:true });
}

// Gallery carousel prev/next buttons (touch swipe works natively via scroll-snap)
const galleryTrack = document.getElementById('galleryTrack');
if(galleryTrack){
  const galleryPrev = document.querySelector('.gallery-nav.prev');
  const galleryNext = document.querySelector('.gallery-nav.next');
  const galleryStep = () => galleryTrack.querySelector('.gallery-slide').offsetWidth + 16;
  galleryPrev.addEventListener('click', () => galleryTrack.scrollBy({ left: -galleryStep(), behavior:'smooth' }));
  galleryNext.addEventListener('click', () => galleryTrack.scrollBy({ left: galleryStep(), behavior:'smooth' }));

  // Mouse drag-to-scroll (desktop has no touch swipe)
  let isDragging = false, dragStartX = 0, dragScrollStart = 0, dragMoved = false;
  galleryTrack.addEventListener('mousedown', e => {
    isDragging = true;
    dragMoved = false;
    dragStartX = e.pageX;
    dragScrollStart = galleryTrack.scrollLeft;
    galleryTrack.classList.add('dragging');
  });
  window.addEventListener('mousemove', e => {
    if(!isDragging) return;
    const dx = e.pageX - dragStartX;
    if(Math.abs(dx) > 4) dragMoved = true;
    galleryTrack.scrollLeft = dragScrollStart - dx;
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
    galleryTrack.classList.remove('dragging');
  });
  // Prevent the drag from also triggering an accidental image click/navigation
  galleryTrack.addEventListener('click', e => { if(dragMoved) e.preventDefault(); }, true);

  // Lightbox: click a slide to view it full-size, arrows/swipe/keys to move through the set
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const slides = [...galleryTrack.querySelectorAll('.gallery-slide')].map(slide => ({
    src: slide.querySelector('img').getAttribute('src'),
    alt: slide.querySelector('img').getAttribute('alt'),
    caption: slide.querySelector('.build-caption') ? slide.querySelector('.build-caption').textContent : ''
  }));
  let lbIndex = 0;

  function renderLightbox(){
    lightboxImg.classList.remove('show');
    lightboxImg.src = slides[lbIndex].src;
    lightboxImg.alt = slides[lbIndex].alt;
    lightboxCaption.textContent = slides[lbIndex].caption;
    lightboxImg.onload = () => lightboxImg.classList.add('show');
  }
  function openLightbox(i){
    if(dragMoved) return;
    lbIndex = i;
    renderLightbox();
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('open'));
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox(){
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { lightbox.hidden = true; }, 300);
  }
  function stepLightbox(dir){
    lbIndex = (lbIndex + dir + slides.length) % slides.length;
    renderLightbox();
  }

  galleryTrack.querySelectorAll('.gallery-slide').forEach(slide => {
    slide.addEventListener('click', () => openLightbox(Number(slide.dataset.lightboxIndex)));
  });
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', () => stepLightbox(-1));
  lightboxNext.addEventListener('click', () => stepLightbox(1));
  lightbox.addEventListener('click', e => { if(e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if(lightbox.hidden) return;
    if(e.key === 'Escape') closeLightbox();
    if(e.key === 'ArrowLeft') stepLightbox(-1);
    if(e.key === 'ArrowRight') stepLightbox(1);
  });
  let lbTouchX = 0;
  lightbox.addEventListener('touchstart', e => { lbTouchX = e.touches[0].clientX; }, { passive:true });
  lightbox.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - lbTouchX;
    if(Math.abs(dx) > 40) stepLightbox(dx > 0 ? -1 : 1);
  }, { passive:true });
}

// Sticky header shadow
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 10);
}, { passive:true });

// Scroll reveal
if(prefersReduced){
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// Floating book button (only runs on pages that have all three elements)
const floatBook = document.getElementById('floatBook');
const contactSection = document.getElementById('contact');
const heroSection = document.querySelector('.hero');
if(floatBook && contactSection && heroSection){
  let contactInView = false;
  let floatVisible = false;
  const contactIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => { contactInView = entry.isIntersecting; });
  }, { threshold: 0.1 });
  contactIO.observe(contactSection);
  window.addEventListener('scroll', () => {
    const shouldShow = window.scrollY > heroSection.offsetHeight * 0.8 && !contactInView;
    if(shouldShow && !floatVisible){
      floatBook.classList.remove('hide');
      floatBook.classList.add('show');
      floatVisible = true;
    } else if(!shouldShow && floatVisible){
      floatBook.classList.remove('show');
      floatBook.classList.add('hide');
      floatVisible = false;
      // Re-enable bounce animation on next show
      floatBook.addEventListener('animationend', () => {
        if(!floatVisible) floatBook.classList.remove('hide');
      }, { once: true });
    }
  }, { passive:true });
}

// FAQ accordion (smooth height animation via grid-template-rows)
document.querySelectorAll('.faq-trigger').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    document.getElementById(btn.getAttribute('aria-controls')).classList.toggle('open', !expanded);
  });
});

// Street / Trail segmented toggle
const stToggle = document.querySelector('.st-toggle');
if(stToggle){
  const stTabs = stToggle.querySelectorAll('.st-tab');
  const stPanels = document.querySelectorAll('.st-panel');
  function activateStTab(target){
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
      if(e.key === 'ArrowLeft' || e.key === 'ArrowRight'){
        e.preventDefault();
        const other = [...stTabs].find(t => t !== tab);
        other.focus();
        activateStTab(other.dataset.target);
      }
    });
  });
}
