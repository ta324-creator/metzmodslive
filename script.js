<script>
// Mobile menu
const openMenu = document.getElementById('openMenu');
const closeMenu = document.getElementById('closeMenu');
const navLinks = document.getElementById('navLinks');
function toggleMenu(open){
  navLinks.classList.toggle('open', open);
  openMenu.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}
openMenu.addEventListener('click', () => toggleMenu(true));
closeMenu.addEventListener('click', () => toggleMenu(false));
navLinks.querySelectorAll('a[data-nav]').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
document.addEventListener('keydown', e => { if(e.key === 'Escape') toggleMenu(false); });

// Sticky header shadow
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 10);
}, { passive:true });

// Scroll reveal
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
