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
    heroDots.forEach((d, idx) => d.classList.toggle('active', idx === heroIndex));
  }
  function startHeroAuto(){
    clearInterval(heroTimer);
    if(!prefersReduced){
      heroTimer = setInterval(() => showHeroSlide(heroIndex + 1), 5500);
    }
  }
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
  const contactIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => { contactInView = entry.isIntersecting; });
  }, { threshold: 0.1 });
  contactIO.observe(contactSection);
  window.addEventListener('scroll', () => {
    const pastHero = window.scrollY > heroSection.offsetHeight * 0.8;
    floatBook.classList.toggle('show', pastHero && !contactInView);
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
