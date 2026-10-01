/**
 * Backstage Karaokê - Interactive Application Script
 */

function bootstrap() {
  initWelcomeScreen();
  initHeader();
  initMobileMenu();
  initSplitCalculator();
  initMenuTabs();
  initLightbox();
  initSmoothScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// WhatsApp Link Generator
const WHATSAPP_PHONE = '556181426321';

export function createWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

// 0. Welcome Screen / Splash Landing
function initWelcomeScreen() {
  const welcomeScreen = document.getElementById('welcomeScreen');
  if (!welcomeScreen) return;

  // Persist exit within session
  try {
    if (sessionStorage.getItem('backstage_entered') === 'true' && window.location.hash !== '#welcome') {
      welcomeScreen.style.display = 'none';
      return;
    }
  } catch(e) {}

  const hash = window.location.hash;
  if (hash && hash !== '#welcome' && hash !== '#inicio') {
    welcomeScreen.style.display = 'none';
    return;
  }

  function dismiss(targetId) {
    try {
      sessionStorage.setItem('backstage_entered', 'true');
    } catch(err) {}

    welcomeScreen.classList.add('fade-out');
    setTimeout(() => {
      welcomeScreen.style.display = 'none';
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 380);
  }

  // Expose globally for instant inline clicks
  window.dismissWelcome = (e, targetId) => {
    if (e && e.preventDefault) e.preventDefault();
    dismiss(targetId);
  };

  const enterBtn = document.getElementById('enterSiteBtn');
  if (enterBtn) {
    enterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      dismiss('inicio');
    });
  }

  const salasBtn = document.getElementById('welcomeSalasBtn');
  if (salasBtn) {
    salasBtn.addEventListener('click', (e) => {
      e.preventDefault();
      dismiss('salas');
    });
  }

  const cardapioBtn = document.getElementById('welcomeCardapioBtn');
  if (cardapioBtn) {
    cardapioBtn.addEventListener('click', () => {
      try {
        sessionStorage.setItem('backstage_entered', 'true');
      } catch(err) {}
    });
  }
}

// 1. Header scroll effect
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

// 2. Mobile Menu Drawer
function initMobileMenu() {
  const toggleBtn = document.querySelector('.menu-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  if (!toggleBtn || !drawer) return;

  const toggleMenu = () => {
    const isOpen = drawer.classList.toggle('open');
    toggleBtn.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  toggleBtn.addEventListener('click', toggleMenu);

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
      toggleBtn.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

// 3. Interactive Split Calculator
function initSplitCalculator() {
  const slider = document.getElementById('calcGuestsSlider');
  const guestsCountLabel = document.getElementById('calcGuestsCount');
  const valRed = document.getElementById('calcRedVal');
  const valGreen = document.getElementById('calcGreenVal');
  const valBlue = document.getElementById('calcBlueVal');

  if (!slider) return;

  const updateCalculations = () => {
    const guests = parseInt(slider.value, 10);
    guestsCountLabel.textContent = `${guests} pessoas`;

    // Sala Red: R$ 800 (max 30)
    if (guests <= 30) {
      const perPersonRed = (800 / guests).toFixed(2).replace('.', ',');
      valRed.textContent = `R$ ${perPersonRed}`;
      valRed.style.opacity = '1';
    } else {
      valRed.textContent = 'Cap. Max (30)';
      valRed.style.opacity = '0.5';
    }

    // Sala Green: R$ 900 (max 40)
    if (guests <= 40) {
      const perPersonGreen = (900 / guests).toFixed(2).replace('.', ',');
      valGreen.textContent = `R$ ${perPersonGreen}`;
      valGreen.style.opacity = '1';
    } else {
      valGreen.textContent = 'Cap. Max (40)';
      valGreen.style.opacity = '0.5';
    }

    // Sala Blue: R$ 1.000 (max 50)
    const perPersonBlue = (1000 / guests).toFixed(2).replace('.', ',');
    valBlue.textContent = `R$ ${perPersonBlue}`;
    valBlue.style.opacity = '1';
  };

  slider.addEventListener('input', updateCalculations);
  updateCalculations();
}

// 4. Menu Tabs System
function initMenuTabs() {
  const tabBtns = document.querySelectorAll('.menu-tab-btn');
  const panels = document.querySelectorAll('.menu-category-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetCategory = btn.getAttribute('data-category');

      tabBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePanel = document.getElementById(`cat-${targetCategory}`);
      if (activePanel) {
        activePanel.classList.add('active');
      }
    });
  });
}

// 5. Lightbox Modal for Menu PDF Pages
function initLightbox() {
  const modal = document.getElementById('lightboxModal');
  const modalImg = document.getElementById('lightboxImg');
  const modalClose = document.getElementById('lightboxClose');
  const thumbs = document.querySelectorAll('.pdf-thumb-card');

  if (!modal || !modalImg) return;

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const fullSrc = thumb.getAttribute('data-full-img');
      if (fullSrc) {
        modalImg.src = fullSrc;
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  const closeModal = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
}

// 6. Smooth Scroll and Active link tracking
function initSmoothScroll() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, {
    rootMargin: '-20% 0px -70% 0px'
  });

  sections.forEach(section => observer.observe(section));
}
