/**
 * Backstage Karaokê - Interactive Application Script
 */

import { initKaraokeMap } from './mapa/KaraokeMap.js';
import { salvarAgendamento, db } from './lib/firebase.js';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { 
  isSupabaseConfigured,
  getConfiguracoesSupabase,
  getBloqueiosSupabase,
  getSalasSupabase,
  getCardapioSupabase,
  getGaleriaSupabase,
  criarReservaComCompliance,
  buscarReservaPorCodigo,
  registrarConsentimentoLGPD,
  registrarPagamentoSeguro
} from './lib/supabase.js';
import {
  REGRAS_AMBIENTES,
  TERMOS_COMPRA_RESERVA,
  POLITICA_PRIVACIDADE,
  VERSAO_DOCUMENTOS
} from './lib/legalTexts.js';
import {
  generateReservationCode,
  generateQrCodeToken,
  generateQrCodeSvg
} from './lib/qrcode.js';
import {
  createPaymentSession,
  processPaymentConfirmation,
  PAYMENT_METHODS
} from './lib/payment.js';
import {
  MESAS_SALAO,
  LOTACAO_MAXIMA_SALAO,
  TAXAS_POR_PESSOA,
  validarCapacidadeMesa,
  calcularValorReserva,
  getMesaById
} from './lib/mesasSalao.js';

// ============================================================================
// ESTADO GLOBAL COMPARTILHADO (CALENDÁRIO, SALAS E SALÃO PRINCIPAL)
// ============================================================================
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

let activeBlockedDates = [];
let WHATSAPP_PHONE = '556181426321';

// Estado do Calendário de Salas
let selectedBookingDate = null;
let selectedBookingRoom = null;
let pendingRoomSelection = null;
let currentBookingStep = 1;
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();

// Estado do Mapa e Calendário do Salão Principal
let selectedMesaId = 'mesa-30';
let selectedReservaData = null; // { dateStr: 'YYYY-MM-DD', formattedDisplay: 'Quarta, 07/10/2026' }
let selectedReservaHorario = '20:00';
let selectedMetodoTarifa = 'pix'; // 'pix' | 'debito' | 'credito'
let modalCalYear = new Date().getFullYear();
let modalCalMonth = new Date().getMonth();
let reservasOcupadas = [];
let activeConfirmedReservation = null;

export function createWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

function bootstrap() {
  try { initWelcomeScreen(); } catch(e) { console.warn('initWelcomeScreen error:', e); }
  try { initHeader(); } catch(e) { console.warn('initHeader error:', e); }
  try { initMobileMenu(); } catch(e) { console.warn('initMobileMenu error:', e); }
  try { initSplitCalculator(); } catch(e) { console.warn('initSplitCalculator error:', e); }
  try { initMenuTabs(); } catch(e) { console.warn('initMenuTabs error:', e); }
  try { initLightbox(); } catch(e) { console.warn('initLightbox error:', e); }
  try { initSmoothScroll(); } catch(e) { console.warn('initSmoothScroll error:', e); }
  try { initSectionTracking(); } catch(e) { console.warn('initSectionTracking error:', e); }
  try { initBookingSystem(); } catch(e) { console.warn('initBookingSystem error:', e); }
  try { initMapaSalaoPrincipal(); } catch(e) { console.warn('initMapaSalaoPrincipal error:', e); }
  try { handleInitialHashNavigation(); } catch(e) { console.warn('handleInitialHashNavigation error:', e); }
  try { initSalasGallery(); } catch(e) { console.warn('initSalasGallery error:', e); }
  try { loadPublicDataFromFirestore(); } catch(e) { console.warn('loadPublicDataFromFirestore error:', e); }
}


// 0. Welcome Screen / Splash Landing
function initWelcomeScreen() {
  const welcomeScreen = document.getElementById('welcomeScreen');
  if (!welcomeScreen) return;

  const hash = window.location.hash;
  if (!hash || hash === '#welcome' || hash === '#' || sessionStorage.getItem('backstage_show_welcome') === 'true') {
    try {
      sessionStorage.removeItem('backstage_entered');
      sessionStorage.removeItem('backstage_show_welcome');
    } catch(e) {}
    welcomeScreen.style.display = 'flex';
    welcomeScreen.classList.remove('fade-out');
    window.scrollTo(0, 0);
  } else if (sessionStorage.getItem('backstage_entered') === 'true') {
    welcomeScreen.style.display = 'none';
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#welcome') {
      try { 
        sessionStorage.removeItem('backstage_entered'); 
        sessionStorage.setItem('backstage_from_welcome', 'true');
      } catch(e) {}
      welcomeScreen.style.display = 'flex';
      welcomeScreen.classList.remove('fade-out');
      window.scrollTo(0, 0);
    }
  });

  function dismiss(targetId) {
    try {
      sessionStorage.setItem('backstage_entered', 'true');
      sessionStorage.setItem('backstage_from_welcome', 'false');
      if (targetId) {
        sessionStorage.setItem('backstage_last_section', targetId);
      }
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
    dismiss(targetId || 'inicio');
  };

  const enterBtn = document.getElementById('enterSiteBtn');
  if (enterBtn) {
    enterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Direciona ao Hero onde o usuário pode escolher entre Reservar Sala e Reservar Mesa
      dismiss('inicio');
    });
  }

  const salasBtn = document.getElementById('welcomeSalasBtn');
  if (salasBtn) {
    salasBtn.addEventListener('click', () => {
      try {
        sessionStorage.setItem('backstage_entered', 'true');
        sessionStorage.setItem('backstage_from_welcome', 'true');
        sessionStorage.setItem('backstage_last_section', 'welcome');
      } catch(err) {}
    });
  }

  const cardapioBtn = document.getElementById('welcomeCardapioBtn');
  if (cardapioBtn) {
    cardapioBtn.addEventListener('click', () => {
      try {
        sessionStorage.setItem('backstage_entered', 'true');
        sessionStorage.setItem('backstage_from_welcome', 'true');
        sessionStorage.setItem('backstage_last_section', 'welcome');
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
window.toggleMobileMenu = function() {
  const toggleBtn = document.getElementById('menuToggleBtn') || document.querySelector('.menu-toggle');
  const drawer = document.getElementById('mobileDrawer') || document.querySelector('.mobile-drawer');
  if (!drawer) return;

  const isOpen = drawer.classList.toggle('open');
  if (toggleBtn) {
    toggleBtn.classList.toggle('active', isOpen);
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
  document.body.style.overflow = isOpen ? 'hidden' : '';
};

window.closeMobileMenu = function() {
  const toggleBtn = document.getElementById('menuToggleBtn') || document.querySelector('.menu-toggle');
  const drawer = document.getElementById('mobileDrawer') || document.querySelector('.mobile-drawer');
  if (drawer) drawer.classList.remove('open');
  if (toggleBtn) {
    toggleBtn.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
  }
  document.body.style.overflow = '';
};

function initMobileMenu() {
  const toggleBtn = document.querySelector('.menu-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.toggleMobileMenu();
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      window.closeMobileMenu();
    });
  });

  // Close when clicking outside drawer
  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('open') && !drawer.contains(e.target) && !toggleBtn.contains(e.target)) {
      window.closeMobileMenu();
    }
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
window.switchMenuCategory = function(targetCategory) {
  const tabBtns = document.querySelectorAll('.menu-tab-btn');
  const panels = document.querySelectorAll('.menu-category-panel');

  tabBtns.forEach(b => {
    if (b.getAttribute('data-category') === targetCategory) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  panels.forEach(p => {
    if (p.id === `cat-${targetCategory}`) {
      p.classList.add('active');
      p.style.display = 'block';
    } else {
      p.classList.remove('active');
      p.style.display = 'none';
    }
  });
};

function initMenuTabs() {
  const tabBtns = document.querySelectorAll('.menu-tab-btn');
  if (!tabBtns.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetCategory = btn.getAttribute('data-category');
      window.switchMenuCategory(targetCategory);
    });
  });

  // Ensure initial active tab panel is displayed
  const activeBtn = document.querySelector('.menu-tab-btn.active');
  const initialCategory = activeBtn ? activeBtn.getAttribute('data-category') : 'petiscos';
  window.switchMenuCategory(initialCategory);
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

// 7. Track current active section for smart back-navigation
function initSectionTracking() {
  const sections = document.querySelectorAll('section[id], main > section[id]');
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.target.id) {
        try {
          // Do not overwrite if welcome screen is active
          if (sessionStorage.getItem('backstage_entered') === 'true') {
            sessionStorage.setItem('backstage_last_section', entry.target.id);
          }
        } catch(e) {}
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));

  // Listen to clicks on links navigating away to cardapio or salas from within the site
  document.querySelectorAll('a[href="/cardapio.html"], a[href="/salas.html"]').forEach(link => {
    link.addEventListener('click', () => {
      if (sessionStorage.getItem('backstage_entered') === 'true' && !link.closest('#welcomeScreen')) {
        try {
          sessionStorage.setItem('backstage_from_welcome', 'false');
          const sec = link.closest('section[id]');
          if (sec && sec.id) {
            sessionStorage.setItem('backstage_last_section', sec.id);
          }
        } catch(e) {}
      }
    });
  });
}

// 8. Handle initial hash on page load (returns to exact section smoothly)
function handleInitialHashNavigation() {
  if (window.location.hash && window.location.hash !== '#welcome') {
    try {
      sessionStorage.setItem('backstage_entered', 'true');
    } catch(e) {}
    const ws = document.getElementById('welcomeScreen');
    if (ws) {
      ws.style.display = 'none';
    }
    setTimeout(() => {
      const target = document.querySelector(window.location.hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  }
}

// 9. Interactive Booking System (Fluxo em 3 Passos & Pop-up por Sala)

// Dados e Personalidades Exclusivas das Salas
const ROOM_DATA = {
  'Sala Blue': {
    name: 'Sala Blue',
    slug: 'sala-blue',
    num: 'Sala 3 • VIP',
    tag: 'blue',
    themeColor: '#00A6FF',
    glowColor: 'rgba(0, 166, 255, 0.45)',
    phrase: 'Você quer me locar? Estou pronta para te proporcionar momentos inesquecíveis!',
    capacidade: 'Até 50 pessoas',
    capacidadeNum: 50,
    precoTotal: 'R$ 1.000,00',
    precoTotalNum: 1000,
    sinal: 'R$ 500,00',
    sinalNum: 500
  },
  'Sala Red': {
    name: 'Sala Red',
    slug: 'sala-red',
    num: 'Sala 1',
    tag: 'red',
    themeColor: '#FF3366',
    glowColor: 'rgba(255, 51, 102, 0.45)',
    phrase: 'Que bom que me escolheu, eu vou te dar momentos que nenhum outro lugar te daria!',
    capacidade: 'Até 30 pessoas',
    capacidadeNum: 30,
    precoTotal: 'R$ 800,00',
    precoTotalNum: 800,
    sinal: 'R$ 400,00',
    sinalNum: 400
  },
  'Sala Green': {
    name: 'Sala Green',
    slug: 'sala-green',
    num: 'Sala 2',
    tag: 'green',
    themeColor: '#00E699',
    glowColor: 'rgba(0, 230, 153, 0.45)',
    phrase: 'Você fez a escolha perfeita! O meu palco é seu para soltar a voz e viver uma noite épica!',
    capacidade: 'Até 40 pessoas',
    capacidadeNum: 40,
    precoTotal: 'R$ 900,00',
    precoTotalNum: 900,
    sinal: 'R$ 450,00',
    sinalNum: 450
  }
};

function initBookingSystem() {
  const calContainer = document.getElementById('bookingCalendar');
  if (!calContainer) return;

  const prevBtn = document.getElementById('calPrevMonth');
  const nextBtn = document.getElementById('calNextMonth');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const today = new Date();
      if (currentCalYear > today.getFullYear() || (currentCalYear === today.getFullYear() && currentCalMonth > today.getMonth())) {
        currentCalMonth--;
        if (currentCalMonth < 0) {
          currentCalMonth = 11;
          currentCalYear--;
        }
        renderCalendar();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentCalMonth++;
      if (currentCalMonth > 11) {
        currentCalMonth = 0;
        currentCalYear++;
      }
      renderCalendar();
    });
  }

  // Máscara e formatação de telefone celular (WhatsApp)
  const setupPhoneMask = (input) => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 11) v = v.substring(0, 11);
      if (v.length > 6) {
        e.target.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
      } else if (v.length > 2) {
        e.target.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
      } else if (v.length > 0) {
        e.target.value = `(${v}`;
      }
    });
  };

  setupPhoneMask(document.getElementById('bookingWhatsapp'));
  setupPhoneMask(document.getElementById('modalBookingWhatsapp'));

  renderCalendar();
}

function renderCalendar() {
  const monthLabel = document.getElementById('calMonthLabel');
  const daysGrid = document.getElementById('calDaysGrid');
  if (!monthLabel || !daysGrid) return;

  monthLabel.textContent = `${MONTH_NAMES[currentCalMonth]} ${currentCalYear}`;
  daysGrid.innerHTML = '';

  const firstDayIndex = new Date(currentCalYear, currentCalMonth, 1).getDay();
  const totalDays = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(currentCalYear, currentCalMonth, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Dias do mês anterior para completar o início da grade (sem buracos)
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDayNum = prevMonthTotalDays - i;
    const blank = document.createElement('div');
    blank.className = 'calendar-day-btn other-month';
    blank.textContent = prevDayNum;
    blank.setAttribute('aria-hidden', 'true');
    daysGrid.appendChild(blank);
  }

  // 2. Dias do mês atual
  for (let d = 1; d <= totalDays; d++) {
    const cellDate = new Date(currentCalYear, currentCalMonth, d);
    cellDate.setHours(0, 0, 0, 0);
    const dayOfWeek = cellDate.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sab
    const isPast = cellDate < today;
    const isClosed = (dayOfWeek === 0 || dayOfWeek === 1); // Domingo e Segunda fechado regular
    const isPromo = (dayOfWeek >= 2 && dayOfWeek <= 4); // Terça a Quinta: Ganhe R$ 200 em consumação

    const dayBtn = document.createElement('button');
    dayBtn.type = 'button';
    dayBtn.className = 'calendar-day-btn';
    dayBtn.textContent = d;

    const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const formattedDisplay = `${WEEKDAY_NAMES[dayOfWeek]}, ${String(d).padStart(2, '0')}/${String(currentCalMonth + 1).padStart(2, '0')}/${currentCalYear}`;

    const isBlocked = (activeBlockedDates || []).some(b => {
      if (!b) return false;
      const bData = b.data || b.dataBloqueio || b.date;
      if (bData !== dateStr) return false;
      return !b.sala || b.sala === 'todas' || b.tipo === 'dia_inteiro';
    });

    if (isPast) {
      dayBtn.classList.add('disabled', 'past');
      dayBtn.disabled = true;
      dayBtn.title = 'Data anterior ao dia de hoje';
    } else if (isBlocked) {
      dayBtn.classList.add('disabled', 'blocked');
      dayBtn.disabled = true;
      dayBtn.title = 'Data indisponível para agendamento (Bloqueada pelo Backstage)';
    } else if (isClosed) {
      dayBtn.classList.add('closed');
      dayBtn.title = 'Fechado ao público (Disponível sob consulta no WhatsApp)';
      dayBtn.addEventListener('click', () => {
        alert('Domingos e segundas o Backstage é fechado ao público regular. Para eventos fechados exclusivos, consulte pelo WhatsApp!');
      });
    } else {
      dayBtn.classList.add('open');
      if (isPromo) {
        dayBtn.classList.add('promo');
        dayBtn.title = 'Promoção: Ganhe R$ 200 em consumação!';
      }

      if (selectedBookingDate && selectedBookingDate.dateStr === dateStr) {
        dayBtn.classList.add('selected');
      }

      dayBtn.addEventListener('click', () => {
        document.querySelectorAll('.calendar-day-btn.selected').forEach(b => b.classList.remove('selected'));
        dayBtn.classList.add('selected');

        selectedBookingDate = {
          dateStr,
          formattedDisplay,
          day: d,
          isPromo
        };

        // Atualiza a barra de confirmação que aparece imediatamente abaixo do calendário
        const confirmBar = document.getElementById('dateConfirmBar');
        const displayText = document.getElementById('selectedDateDisplayText');
        const promoNotice = document.getElementById('selectedDatePromoNotice');

        if (confirmBar) {
          confirmBar.style.display = 'flex';
          confirmBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (displayText) {
          displayText.textContent = formattedDisplay;
        }
        if (promoNotice) {
          promoNotice.style.display = isPromo ? 'block' : 'none';
        }

        // Atualiza resumos nos passos e modais
        const step2Date = document.getElementById('step2DateSummary');
        if (step2Date) step2Date.textContent = formattedDisplay;

        const modalDate = document.getElementById('modalDateBadge');
        if (modalDate) modalDate.textContent = `📅 ${formattedDisplay}`;

        const summaryDate = document.getElementById('summaryDateVal');
        if (summaryDate) summaryDate.textContent = formattedDisplay;
      });
    }

    daysGrid.appendChild(dayBtn);
  }

  // 3. Dias do próximo mês para completar a grade em um retângulo perfeito (35 ou 42 células)
  const totalCellsRendered = firstDayIndex + totalDays;
  const targetTotal = totalCellsRendered > 35 ? 42 : 35;
  const nextDaysNeeded = targetTotal - totalCellsRendered;

  for (let n = 1; n <= nextDaysNeeded; n++) {
    const nextBtn = document.createElement('div');
    nextBtn.className = 'calendar-day-btn other-month';
    nextBtn.textContent = n;
    nextBtn.setAttribute('aria-hidden', 'true');
    daysGrid.appendChild(nextBtn);
  }
}

// Navegação entre os 3 Passos ("Apareça uma coisa de cada vez")
window.goToBookingStep = (step) => {
  if (step === 2) {
    if (!selectedBookingDate) {
      alert('Por favor, selecione primeiro uma data disponível no calendário!');
      const cal = document.getElementById('bookingCalendar');
      if (cal) cal.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }

  if (step === 3) {
    if (!selectedBookingDate) {
      alert('Por favor, selecione uma data no calendário antes de continuar!');
      window.goToBookingStep(1);
      return;
    }
    if (!selectedBookingRoom) {
      alert('Por favor, escolha uma sala privada antes de preencher seus dados!');
      window.goToBookingStep(2);
      return;
    }
  }

  currentBookingStep = step;

  // Alterna painéis
  const panel1 = document.getElementById('bookingStep1');
  const panel2 = document.getElementById('bookingStep2');
  const panel3 = document.getElementById('bookingStep3');

  if (panel1) panel1.style.display = (step === 1 ? 'block' : 'none');
  if (panel2) panel2.style.display = (step === 2 ? 'block' : 'none');
  if (panel3) panel3.style.display = (step === 3 ? 'block' : 'none');

  // Atualiza Stepper visual
  const s1 = document.getElementById('stepperStep1');
  const s2 = document.getElementById('stepperStep2');
  const s3 = document.getElementById('stepperStep3');
  const line1 = document.getElementById('stepperLine1');
  const line2 = document.getElementById('stepperLine2');

  [s1, s2, s3].forEach((s, idx) => {
    if (!s) return;
    const stepNum = idx + 1;
    s.classList.remove('active', 'completed');
    if (stepNum === step) {
      s.classList.add('active');
    } else if (stepNum < step) {
      s.classList.add('completed');
    }
  });

  if (line1) {
    if (step >= 2) line1.classList.add('active');
    else line1.classList.remove('active');
  }
  if (line2) {
    if (step >= 3) line2.classList.add('active');
    else line2.classList.remove('active');
  }

  // Scroll suave para a seção de agendamento
  const agendamentoSec = document.getElementById('agendamento');
  if (agendamentoSec) {
    agendamentoSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Pop-up Exclusivo por Sala ("Você quer me locar?", etc)
window.openRoomPersonalityModal = (roomName) => {
  const room = ROOM_DATA[roomName];
  if (!room) return;

  pendingRoomSelection = roomName;

  const modal = document.getElementById('roomPersonalityModal');
  const dialog = document.getElementById('roomPersonalityDialog');
  const glow = document.getElementById('roomPersonalityGlow');
  const badgeText = document.getElementById('popupRoomBadgeText');
  const phraseEl = document.getElementById('popupRoomPhrase');
  const capEl = document.getElementById('popupRoomCap');
  const totalEl = document.getElementById('popupRoomTotal');
  const signalEl = document.getElementById('popupRoomSignal');
  const confirmBtnText = document.getElementById('btnConfirmRoomText');

  if (badgeText) badgeText.textContent = `${room.name} • ${room.capacidade}`;
  if (phraseEl) phraseEl.textContent = room.phrase;
  if (capEl) capEl.textContent = room.capacidade;
  if (totalEl) totalEl.textContent = room.precoTotal;
  if (signalEl) signalEl.textContent = room.sinal;
  if (confirmBtnText) confirmBtnText.textContent = `Sim, Quero a ${room.name}! Continuar →`;

  // Estilização neon com a cor da sala
  if (dialog) {
    dialog.style.borderColor = room.themeColor;
    dialog.style.boxShadow = `0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px ${room.glowColor}`;
  }
  if (glow) {
    glow.style.background = `radial-gradient(ellipse at center, ${room.glowColor} 0%, transparent 70%)`;
  }

  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

window.closeRoomPersonalityModal = () => {
  const modal = document.getElementById('roomPersonalityModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
};

window.confirmRoomFromPopup = () => {
  if (pendingRoomSelection) {
    selectedBookingRoom = pendingRoomSelection;
    const room = ROOM_DATA[selectedBookingRoom];

    // Atualiza resumo no formulário embutido caso alguém acesse
    const summaryRoom = document.getElementById('summaryRoomName');
    const summaryCap = document.getElementById('summaryCapVal');
    const summaryTotal = document.getElementById('summaryTotalVal');
    const summarySignal = document.getElementById('summarySignalVal');
    const pessoasInput = document.getElementById('bookingPessoas');

    if (summaryRoom && room) {
      summaryRoom.textContent = room.name;
      summaryRoom.style.color = room.themeColor;
    }
    if (summaryCap && room) summaryCap.textContent = room.capacidade;
    if (summaryTotal && room) summaryTotal.textContent = room.precoTotal;
    if (summarySignal && room) summarySignal.textContent = `Sinal de 50%: ${room.sinal} • No dia: ${room.sinal}`;
    if (pessoasInput && room) {
      pessoasInput.max = room.capacidadeNum;
      pessoasInput.placeholder = `Ex: ${Math.round(room.capacidadeNum * 0.7)} convidados (máx: ${room.capacidadeNum})`;
    }
  }

  // Transição direta para o Pop-up de Dados (sem jogar o usuário de volta pra tela)
  window.closeRoomPersonalityModal();
  window.openBookingDataModal();
};

// ============================================================================
// MAPA INTERATIVO DO SALÃO PRINCIPAL (LOTAÇÃO MÁXIMA: 184 PESSOAS)
// FLUXO DE RESERVA NA ORDEM EXATA (PASSOS 1 A 9)
// ============================================================================



// Inicializa Mapa 2D Vetorial Interativo do Salão Principal
export function initMapaSalaoPrincipal() {
  const container = document.getElementById('karaokeMapMount');
  if (container) {
    initKaraokeMap('karaokeMapMount');
  }
  carregarReservasOcupadas();
}

async function carregarReservasOcupadas() {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await (await import('./lib/supabase.js')).getReservasSupabase();
      if (!error && Array.isArray(data)) {
        reservasOcupadas = data.filter(r => (r.status || '').toUpperCase() !== 'CANCELLED');
        atualizarStatusMesasNoMapa();
      }
    }
  } catch (e) {
    console.warn('Consulta reservas ocupadas:', e);
  }
}

function isMesaReservada(mesaId, dataStr, horarioStr) {
  if (!dataStr || !horarioStr) return false;
  return reservasOcupadas.some(r => {
    const rData = r.data || '';
    const rHora = r.horario || '';
    const rMesa = r.salaOuMesa || r.sala || '';
    const matchData = rData.includes(dataStr) || (selectedReservaData && rData.includes(selectedReservaData.formattedDisplay));
    const matchHora = rHora === horarioStr;
    const matchMesa = rMesa.toLowerCase().includes(mesaId.toLowerCase()) || 
                      (getMesaById(mesaId) && rMesa.toLowerCase().includes(getMesaById(mesaId).nomeExibicao.toLowerCase()));
    return matchData && matchHora && matchMesa;
  });
}

function renderHotspotsNoMapa() {
  // Substituído pelo novo componente vetorial 2D (KaraokeMap)
}

function renderListaMesasNaPagina() {
  if (window.karaokeMapInstance) {
    window.karaokeMapInstance.updateTablesList();
  }
}

function renderListaMesasNoModal() {
  // Modal antigo opcional
}

function atualizarStatusMesasNoMapa() {
  if (window.karaokeMapInstance) {
    window.karaokeMapInstance.updateTablesList();
  }
}

// ----------------------------------------------------------------------------
// FLUXO DE SELEÇÃO E RESERVA DE MESA
// ----------------------------------------------------------------------------

// 1. Cliente clica na mesa desejada no mapa
window.selecionarMesaNoMapa = (mesaId, isFromPageMap = false) => {
  if (window.karaokeMapInstance) {
    window.karaokeMapInstance.handleTableClick(mesaId);
    return;
  }
  const mesa = getMesaById(mesaId);
  if (!mesa) return;

  selectedMesaId = mesaId;
  atualizarStatusMesasNoMapa();

  // Atualiza etiquetas informativas nos modais
  const badgeMesa = document.getElementById('modalBadgeMesaEscolhida');
  const badgeMesa2 = document.getElementById('modalBadgeMesaEscolhida2');
  const badgeMesa3 = document.getElementById('modalBadgeMesaEscolhida3');
  const capTag = document.getElementById('modalMesaCapacidadeTag');
  const capHelper = document.getElementById('modalCapacidadeHelper');
  const inputPessoas = document.getElementById('modalBookingPessoas');
  const promptTxt = document.getElementById('modalMesaSelectPrompt');
  const btnAvancarData = document.getElementById('btnAvancarParaData');

  const descCapacidade = `${mesa.nomeExibicao} (${mesa.rotuloCapacidade})`;
  if (badgeMesa) badgeMesa.textContent = descCapacidade;
  if (badgeMesa2) badgeMesa2.textContent = descCapacidade;
  if (badgeMesa3) badgeMesa3.textContent = descCapacidade;
  if (capTag) capTag.textContent = `Capacidade: ${mesa.rotuloCapacidade}`;
  if (capHelper) capHelper.textContent = `Esta mesa acomoda no máximo ${mesa.capacidade} pessoas.`;
  if (inputPessoas) {
    inputPessoas.max = mesa.capacidade;
    if (parseInt(inputPessoas.value || '0', 10) > mesa.capacidade) {
      inputPessoas.value = Math.min(4, mesa.capacidade);
    }
  }

  if (promptTxt) promptTxt.textContent = `✓ ${mesa.nomeExibicao} selecionada!`;
  if (btnAvancarData) btnAvancarData.disabled = false;

  // Se clicou no mapa da página principal, abre o modal direto no Passo 2 (Data)!
  if (isFromPageMap) {
    window.abrirModalNoPasso(2);
  } else {
    // Se estava dentro do modal no Passo 1, avança suavemente para o Passo 2 (Data)
    setTimeout(() => {
      window.avancarParaPassoData();
    }, 280);
  }
};

window.iniciarFluxoReservaSite = (e) => {
  if (e && e.preventDefault) e.preventDefault();
  window.abrirModalNoPasso(1);
};

window.abrirModalNoPasso = (passo = 1) => {
  const modal = document.getElementById('bookingDataModal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (passo === 1) {
    window.voltarParaPassoMesa();
  } else if (passo === 2) {
    window.avancarParaPassoData();
  }
};

window.closeBookingDataModal = () => {
  const modal = document.getElementById('bookingDataModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
};

function alternarSecaoFluxo(secaoAtivaId, passoNumero) {
  const secoes = [
    'chkSectionMesa',
    'chkSectionData',
    'chkSectionHorario',
    'chkSectionDados',
    'chkSectionResumo',
    'chkSectionPagar',
    'chkSectionConfirmacao'
  ];

  secoes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === secaoAtivaId ? 'block' : 'none');
  });

  // Atualiza stepper
  const badgeMap = {
    1: 'flowStepBadge1',
    2: 'flowStepBadge2',
    3: 'flowStepBadge3',
    4: 'flowStepBadge4',
    6: 'flowStepBadge6',
    8: 'flowStepBadge8',
    9: 'flowStepBadge9',
  };

  Object.keys(badgeMap).forEach(p => {
    const badge = document.getElementById(badgeMap[p]);
    if (!badge) return;
    const num = parseInt(p, 10);
    badge.classList.remove('active', 'completed');
    if (num === passoNumero) {
      badge.classList.add('active');
    } else if (num < passoNumero) {
      badge.classList.add('completed');
    }
  });

  const dialog = document.getElementById('bookingDataDialog');
  if (dialog) dialog.scrollTop = 0;
}

// ----------------------------------------------------------------------------
// 2. Depois escolhe a DATA
// ----------------------------------------------------------------------------
window.voltarParaPassoMesa = () => {
  alternarSecaoFluxo('chkSectionMesa', 1);
};

window.avancarParaPassoData = () => {
  alternarSecaoFluxo('chkSectionData', 2);
  renderModalCalendar();
};

function renderModalCalendar() {
  const monthLabel = document.getElementById('modalCalMonthLabel');
  const daysGrid = document.getElementById('modalCalDaysGrid');
  if (!monthLabel || !daysGrid) return;

  const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  monthLabel.textContent = `${MONTH_NAMES[modalCalMonth]} ${modalCalYear}`;
  daysGrid.innerHTML = '';

  const firstDayIndex = new Date(modalCalYear, modalCalMonth, 1).getDay();
  const totalDays = new Date(modalCalYear, modalCalMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(modalCalYear, modalCalMonth, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Preenche dias do mês anterior
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const blank = document.createElement('div');
    blank.className = 'calendar-day-btn other-month';
    blank.textContent = prevMonthTotalDays - i;
    daysGrid.appendChild(blank);
  }

  // Preenche dias do mês atual
  for (let d = 1; d <= totalDays; d++) {
    const cellDate = new Date(modalCalYear, modalCalMonth, d);
    cellDate.setHours(0, 0, 0, 0);
    const dayOfWeek = cellDate.getDay();
    const isPast = cellDate < today;
    const isClosed = (dayOfWeek === 0 || dayOfWeek === 1); // Dom e Seg fechado

    const dayBtn = document.createElement('button');
    dayBtn.type = 'button';
    dayBtn.className = 'calendar-day-btn';
    dayBtn.textContent = d;

    const dateStr = `${modalCalYear}-${String(modalCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const formattedDisplay = `${WEEKDAY_NAMES[dayOfWeek]}, ${String(d).padStart(2, '0')}/${String(modalCalMonth + 1).padStart(2, '0')}/${modalCalYear}`;

    if (isPast) {
      dayBtn.classList.add('disabled', 'past');
      dayBtn.disabled = true;
    } else if (isClosed) {
      dayBtn.classList.add('closed');
      dayBtn.title = 'Fechado aos Domingos e Segundas';
    } else {
      dayBtn.classList.add('open');
      if (selectedReservaData && selectedReservaData.dateStr === dateStr) {
        dayBtn.classList.add('selected');
      }

      dayBtn.addEventListener('click', () => {
        window.selecionarDataModal(dateStr, formattedDisplay);
      });
    }

    daysGrid.appendChild(dayBtn);
  }

  // 3. Dias do próximo mês para completar a grade em um retângulo perfeito (35 ou 42 células)
  const totalCellsRendered = firstDayIndex + totalDays;
  const targetTotal = totalCellsRendered > 35 ? 42 : 35;
  const nextDaysNeeded = targetTotal - totalCellsRendered;

  for (let n = 1; n <= nextDaysNeeded; n++) {
    const nextBtn = document.createElement('div');
    nextBtn.className = 'calendar-day-btn other-month';
    nextBtn.textContent = n;
    nextBtn.setAttribute('aria-hidden', 'true');
    daysGrid.appendChild(nextBtn);
  }
}

window.modalCalPrevMonth = () => {
  const today = new Date();
  if (modalCalYear > today.getFullYear() || (modalCalYear === today.getFullYear() && modalCalMonth > today.getMonth())) {
    modalCalMonth--;
    if (modalCalMonth < 0) {
      modalCalMonth = 11;
      modalCalYear--;
    }
    renderModalCalendar();
  }
};

window.modalCalNextMonth = () => {
  modalCalMonth++;
  if (modalCalMonth > 11) {
    modalCalMonth = 0;
    modalCalYear++;
  }
  renderModalCalendar();
};

window.selecionarDataModal = (dateStr, formattedDisplay) => {
  selectedReservaData = { dateStr, formattedDisplay };

  const dataPill = document.getElementById('modalBadgeDataDisplay');
  const dataPill2 = document.getElementById('modalBadgeDataEscolhida2');
  const dataPill3 = document.getElementById('modalBadgeDataEscolhida3');
  const btnAvancar = document.getElementById('btnAvancarParaHorario');

  if (dataPill) dataPill.textContent = `📅 ${formattedDisplay}`;
  if (dataPill2) dataPill2.textContent = `📅 ${formattedDisplay}`;
  if (dataPill3) dataPill3.textContent = `📅 ${formattedDisplay}`;
  if (btnAvancar) btnAvancar.disabled = false;

  renderModalCalendar();

  // Avança suavemente para o Passo 3 (Horário)
  setTimeout(() => {
    window.avancarParaPassoHorario();
  }, 220);
};

// ----------------------------------------------------------------------------
// 3. Depois escolhe o HORÁRIO
// ----------------------------------------------------------------------------
window.voltarParaPassoData = () => {
  alternarSecaoFluxo('chkSectionData', 2);
};

window.avancarParaPassoHorario = () => {
  if (!selectedReservaData) {
    const today = new Date();
    selectedReservaData = {
      dateStr: today.toISOString().split('T')[0],
      formattedDisplay: 'Hoje'
    };
  }

  alternarSecaoFluxo('chkSectionHorario', 3);
  renderModalHorarios();
};

function renderModalHorarios() {
  const container = document.getElementById('modalTimeSlotsGrid');
  const avisoBloqueio = document.getElementById('horarioBloqueadoAviso');
  if (!container) return;

  const HORARIOS = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'];
  container.innerHTML = '';

  HORARIOS.forEach(slot => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'time-slot-btn';
    btn.textContent = slot;

    // Valida se a mesa já está reservada para aquele dia e horário
    const ocupada = isMesaReservada(selectedMesaId, selectedReservaData.dateStr, slot);

    if (ocupada) {
      btn.classList.add('disabled', 'reserved');
      btn.disabled = true;
      btn.innerHTML = `${slot} <span style="font-size: 0.65rem; color: #EF4444; display: block;">Ocupada</span>`;
    } else {
      if (slot === selectedReservaHorario) {
        btn.classList.add('selected');
      }

      btn.addEventListener('click', () => {
        window.selecionarHorarioModal(slot);
      });
    }

    container.appendChild(btn);
  });

  if (avisoBloqueio) avisoBloqueio.style.display = 'none';
}

window.selecionarHorarioModal = (slot) => {
  selectedReservaHorario = slot;
  const horaPill3 = document.getElementById('modalBadgeHoraEscolhida3');
  if (horaPill3) horaPill3.textContent = `⏰ ${slot}`;

  renderModalHorarios();

  // Avança para o Passo 4 (Seus Dados)
  setTimeout(() => {
    window.avancarParaPassoDados();
  }, 220);
};

// ----------------------------------------------------------------------------
// 4 & 5. Depois informa seus dados & O sistema valida se a quantidade de pessoas cabe
// ----------------------------------------------------------------------------
window.voltarParaPassoHorario = () => {
  alternarSecaoFluxo('chkSectionHorario', 3);
};

window.avancarParaPassoDados = () => {
  alternarSecaoFluxo('chkSectionDados', 4);
  window.validarCapacidadeEmTempoReal();
};

window.validarCapacidadeEmTempoReal = () => {
  const input = document.getElementById('modalBookingPessoas');
  const alerta = document.getElementById('alertaCapacidadeExcedida');
  const alertaMsg = document.getElementById('alertaCapacidadeMsg');
  if (!input) return;

  const qtd = parseInt(input.value, 10);
  const resultado = validarCapacidadeMesa(selectedMesaId, qtd);

  if (!resultado.valida && resultado.excesso) {
    if (alerta) alerta.style.display = 'block';
    if (alertaMsg) alertaMsg.textContent = resultado.mensagem;
    input.style.borderColor = '#EF4444';
  } else {
    if (alerta) alerta.style.display = 'none';
    input.style.borderColor = '';
  }
};

// 5. O sistema valida se a quantidade de pessoas cabe na mesa escolhida
window.validarEAvancarParaResumo = () => {
  const nome = document.getElementById('modalBookingNome')?.value?.trim();
  const whatsapp = document.getElementById('modalBookingWhatsapp')?.value?.trim();
  const email = document.getElementById('modalBookingEmail')?.value?.trim();
  const pessoasInput = document.getElementById('modalBookingPessoas');
  const qtdPessoas = parseInt(pessoasInput?.value || '0', 10);

  if (!nome || !whatsapp || !email) {
    alert('Por favor, preencha todos os campos obrigatórios (Nome, WhatsApp e E-mail).');
    return;
  }

  if (!email.includes('@') || !email.includes('.')) {
    alert('Por favor, informe um e-mail válido para envio do voucher.');
    return;
  }

  // Validação estrita da capacidade da mesa
  const resultado = validarCapacidadeMesa(selectedMesaId, qtdPessoas);
  if (!resultado.valida) {
    const alerta = document.getElementById('alertaCapacidadeExcedida');
    const alertaMsg = document.getElementById('alertaCapacidadeMsg');
    if (alerta) alerta.style.display = 'block';
    if (alertaMsg) alertaMsg.textContent = resultado.mensagem;
    if (pessoasInput) {
      pessoasInput.focus();
      pessoasInput.style.borderColor = '#EF4444';
    }
    return;
  }

  // Se tudo válido, avança para o Passo 6 (Resumo & Valor)
  window.mostrarResumoEPagamento();
};

// ----------------------------------------------------------------------------
// 6 & 7. Mostra o resumo da reserva e o valor & Cliente escolhe o pagamento
// ----------------------------------------------------------------------------
window.voltarParaPassoDados = () => {
  alternarSecaoFluxo('chkSectionDados', 4);
};

window.mostrarResumoEPagamento = () => {
  alternarSecaoFluxo('chkSectionResumo', 6);

  const mesa = getMesaById(selectedMesaId);
  const nome = document.getElementById('modalBookingNome')?.value?.trim() || 'Cliente';
  const pessoas = parseInt(document.getElementById('modalBookingPessoas')?.value || '4', 10);

  // Preenche dados do Passo 6 (Resumo)
  const resumoMesa = document.getElementById('resumoMesaNome');
  const resumoDataHora = document.getElementById('resumoDataHora');
  const resumoTitular = document.getElementById('resumoTitularNome');
  const resumoQtd = document.getElementById('resumoQtdPessoas');

  if (resumoMesa) resumoMesa.textContent = mesa ? `${mesa.nomeExibicao} (${mesa.rotuloCapacidade})` : 'Mesa Salão';
  if (resumoDataHora) resumoDataHora.textContent = `${selectedReservaData ? selectedReservaData.formattedDisplay : 'Data'} às ${selectedCheckoutHorario || selectedReservaHorario}`;
  if (resumoTitular) resumoTitular.textContent = nome;
  if (resumoQtd) resumoQtd.textContent = `${pessoas} pessoa(s)`;

  // Atualiza valores conforme o método ativo (Passo 7)
  window.selecionarMetodoTarifa(selectedMetodoTarifa);
};

// 7. Cliente escolhe o pagamento (Pix R$20, Débito R$20, Crédito R$25)
window.selecionarMetodoTarifa = (metodo = 'pix') => {
  selectedMetodoTarifa = metodo;
  const pessoas = parseInt(document.getElementById('modalBookingPessoas')?.value || '4', 10);
  const calculo = calcularValorReserva(pessoas, metodo);

  // Atualiza destaques dos cards
  const cardPix = document.getElementById('payCardPix');
  const cardDebito = document.getElementById('payCardDebito');
  const cardCredito = document.getElementById('payCardCredito');

  if (cardPix) cardPix.classList.toggle('selected', metodo === 'pix');
  if (cardDebito) cardDebito.classList.toggle('selected', metodo === 'debito');
  if (cardCredito) cardCredito.classList.toggle('selected', metodo === 'credito');

  // Atualiza valor total e fórmula
  const totalEl = document.getElementById('resumoValorTotalCalculado');
  const formulaEl = document.getElementById('resumoCalculoFormula');
  const nomeMetodo = metodo === 'pix' ? 'Pix' : metodo === 'debito' ? 'Débito' : 'Crédito';

  if (totalEl) totalEl.textContent = calculo.formatadoTotal;
  if (formulaEl) formulaEl.textContent = `${pessoas} pessoa(s) × ${calculo.formatadoUnitario} (${nomeMetodo})`;
};

// ----------------------------------------------------------------------------
// 8. Prossegue para o pagamento (Preparado para Asaas)
// ----------------------------------------------------------------------------
window.voltarParaPassoResumo = () => {
  alternarSecaoFluxo('chkSectionResumo', 6);
};

window.avancarParaPassoPagar = () => {
  const chkTermos = document.getElementById('chkReservaTermosAceitos');
  if (chkTermos && !chkTermos.checked) {
    alert('É obrigatório concordar com os termos de compra e reserva para prosseguir.');
    return;
  }

  alternarSecaoFluxo('chkSectionPagar', 8);

  const pessoas = parseInt(document.getElementById('modalBookingPessoas')?.value || '4', 10);
  const calculo = calcularValorReserva(pessoas, selectedMetodoTarifa);

  const pagarValor = document.getElementById('pagarValorDisplay');
  const pagarMetodo = document.getElementById('pagarMetodoDisplay');
  const pixBox = document.getElementById('pagarPixBox');
  const cartaoBox = document.getElementById('pagarCartaoBox');

  const nomeMetodo = selectedMetodoTarifa === 'pix' ? 'Pix' : selectedMetodoTarifa === 'debito' ? 'Cartão de Débito' : 'Cartão de Crédito';

  if (pagarValor) pagarValor.textContent = calculo.formatadoTotal;
  if (pagarMetodo) pagarMetodo.textContent = `Pagamento via ${nomeMetodo} (R$ ${calculo.valorUnitario}/pessoa)`;

  if (selectedMetodoTarifa === 'pix') {
    if (pixBox) pixBox.style.display = 'block';
    if (cartaoBox) cartaoBox.style.display = 'none';
  } else {
    if (pixBox) pixBox.style.display = 'none';
    if (cartaoBox) cartaoBox.style.display = 'block';
  }
};

window.copiarPixCodigo = () => {
  const input = document.getElementById('chkPixInput');
  if (input) {
    navigator.clipboard?.writeText(input.value);
    const btn = document.getElementById('btnCopiarPix');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Chave Copiada! ✓';
      setTimeout(() => { btn.textContent = orig; }, 2200);
    }
  }
};

// ----------------------------------------------------------------------------
// 9. Após pagamento confirmado, mostra a confirmação da reserva
// ----------------------------------------------------------------------------
window.confirmarPagamentoEFinalizar = async () => {
  const btn = document.getElementById('btnFinalizarPagamento');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Processando e Emitindo Reserva...';
  }

  const nome = document.getElementById('modalBookingNome')?.value?.trim();
  const whatsapp = document.getElementById('modalBookingWhatsapp')?.value?.trim();
  const email = document.getElementById('modalBookingEmail')?.value?.trim();
  const pessoas = parseInt(document.getElementById('modalBookingPessoas')?.value || '4', 10);
  const mesa = getMesaById(selectedMesaId);
  const mesaNome = mesa ? mesa.nomeExibicao : 'Mesa Salão';
  const calculo = calcularValorReserva(pessoas, selectedMetodoTarifa);

  // Gera código único BK-2026-XXXX e tokens
  const codigoReserva = generateReservationCode();
  const qrToken = generateQrCodeToken();
  const qrSvg = generateQrCodeSvg(codigoReserva, 180);

  // Sessão de pagamento segura integrada com Asaas (sem salvar cartão no Supabase)
  const sessionPagamento = await createPaymentSession({
    codigoReserva,
    valor: calculo.valorTotal,
    metodo: selectedMetodoTarifa,
    comprador: { nome, email, whatsapp },
    ambiente: 'Salão Principal'
  });

  const confirmacaoPagamento = await processPaymentConfirmation({
    codigoReserva,
    transacaoId: sessionPagamento.transacaoId,
    metodo: selectedMetodoTarifa
  });

  const reservaData = {
    codigoReserva,
    nome,
    whatsapp,
    email,
    data: selectedReservaData ? selectedReservaData.formattedDisplay : 'Hoje',
    horario: selectedReservaHorario,
    ambienteId: 'salao-principal',
    salaOuMesa: mesaNome,
    sala: mesaNome,
    pessoas,
    status: 'CONFIRMED',
    statusPagamento: 'aprovado',
    transacaoId: confirmacaoPagamento.transacaoId,
    qrCodeToken: qrToken,
    valorTotal: calculo.valorTotal,
    valorSinal: calculo.valorTotal,
    valorPago: calculo.valorTotal,
    metodoPagamento: selectedMetodoTarifa,
    gateway: 'asaas',
    origem: 'site_cliente'
  };

  // Salva no Supabase (com conformidade total e RLS seguro)
  try {
    if (isSupabaseConfigured) {
      await criarReservaComCompliance(reservaData);
    }
  } catch (err) {
    console.warn('Aviso Supabase salvar reserva:', err);
  }

  // Salva no Firestore
  try {
    await salvarAgendamento({
      ...reservaData,
      dataIso: selectedReservaData ? selectedReservaData.dateStr : ''
    });
  } catch (fireErr) {
    console.warn('Fallback Firestore agendamento:', fireErr);
  }

  // Marca imediatamente a mesa como reservada em memória para aquele horário
  reservasOcupadas.push(reservaData);
  atualizarStatusMesasNoMapa();

  activeConfirmedReservation = {
    ...reservaData,
    qrSvg
  };

  // 9. Mostra a confirmação da reserva
  alternarSecaoFluxo('chkSectionConfirmacao', 9);

  const codeEl = document.getElementById('voucherReservationCode');
  const qrContainer = document.getElementById('qrCodeContainer');
  const emailEl = document.getElementById('voucherSentEmail');
  const briefEl = document.getElementById('voucherDetailsBrief');

  if (codeEl) codeEl.textContent = codigoReserva;
  if (qrContainer) qrContainer.innerHTML = qrSvg;
  if (emailEl) emailEl.textContent = email;
  if (briefEl) {
    briefEl.innerHTML = `
      <strong>${nome}</strong> • <strong>${mesaNome}</strong><br>
      📅 ${reservaData.data} às ${reservaData.horario} • 👥 ${pessoas} pessoas<br>
      <span style="color: #10B981; font-weight: 700;">✓ Pago: ${calculo.formatadoTotal} (${selectedMetodoTarifa.toUpperCase()})</span>
    `;
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Confirmar Pagamento e Emitir Reserva ✓';
  }
};

window.compartilharVoucherWhatsApp = () => {
  if (!activeConfirmedReservation) return;
  const r = activeConfirmedReservation;
  const msg = [
    `🎤 *MEU INGRESSO & RESERVA — BACKSTAGE KARAOKÊ*`,
    ``,
    `🎫 *Código:* ${r.codigoReserva}`,
    `👤 *Titular:* ${r.nome}`,
    `🏛️ *Mesa/Espaço:* ${r.salaOuMesa}`,
    `📅 *Data:* ${r.data} às ${r.horario}`,
    `👥 *Convidados:* ${r.pessoas} pessoa(s)`,
    `💰 *Valor Pago:* R$ ${Number(r.valorPago || 0).toFixed(2).replace('.', ',')} (${(r.metodoPagamento || 'Pix').toUpperCase()})`,
    ``,
    `📍 *Endereço:* CLN 307, Bloco A, Subsolo - Asa Norte, Brasília/DF`,
    `Apresente este código na recepção para liberar sua entrada!`
  ].join('\n');

  window.open(createWhatsAppUrl(msg), '_blank');
};

window.imprimirVoucher = () => {
  window.print();
};

// Visualizadores de Documentos Jurídicos Completos
window.openTermosCompletosModal = (e) => {
  if (e && e.preventDefault) e.preventDefault();
  const body = document.getElementById('modalTermosCompletosBody');
  if (body) {
    body.innerHTML = TERMOS_COMPRA_RESERVA
      .split('\n\n')
      .map(p => {
        if (p.startsWith('# ')) return `<h1>${p.substring(2)}</h1>`;
        if (p.startsWith('### ')) return `<h3>${p.substring(4)}</h3>`;
        if (p.startsWith('---')) return `<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 16px 0;">`;
        return `<p>${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
      })
      .join('');
  }
  const modal = document.getElementById('modalTermosCompletos');
  if (modal) modal.style.display = 'flex';
};

window.openPoliticaPrivacidadeModal = (e) => {
  if (e && e.preventDefault) e.preventDefault();
  const body = document.getElementById('modalPoliticaPrivacidadeBody');
  if (body) {
    body.innerHTML = POLITICA_PRIVACIDADE
      .split('\n\n')
      .map(p => {
        if (p.startsWith('# ')) return `<h1>${p.substring(2)}</h1>`;
        if (p.startsWith('### ')) return `<h3>${p.substring(4)}</h3>`;
        if (p.startsWith('---')) return `<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 16px 0;">`;
        return `<p>${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
      })
      .join('');
  }
  const modal = document.getElementById('modalPoliticaPrivacidade');
  if (modal) modal.style.display = 'flex';
};

window.openRegrasAmbienteModal = (e) => {
  if (e && e.preventDefault) e.preventDefault();
  const body = document.getElementById('modalRegrasAmbienteBody');
  const header = document.getElementById('modalRegrasAmbienteHeaderTitle');
  const regraObj = REGRAS_AMBIENTES[selectedCheckoutEnv] || REGRAS_AMBIENTES['salas-privadas'];
  if (header) header.textContent = regraObj.titulo;
  if (body) {
    body.innerHTML = `
      <div class="legal-callout-warning" style="margin-bottom: 16px;">
        <div>${regraObj.avisoDestaque}</div>
      </div>
      <h4 style="color: #FFF; margin-bottom: 10px;">Diretrizes e Regras Oficiais:</h4>
      <ul style="padding-left: 20px;">
        ${regraObj.regras.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
      </ul>
    `;
  }
  const modal = document.getElementById('modalRegrasAmbiente');
  if (modal) modal.style.display = 'flex';
};

window.closeDocViewerModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
};

// Retrocompatibilidade
window.backToRoomPersonalityModal = () => {
  window.closeBookingDataModal();
  if (selectedBookingRoom) {
    window.openRoomPersonalityModal(selectedBookingRoom);
  }
};

window.handleModalBookingSubmit = (e) => {
  if (e && e.preventDefault) e.preventDefault();
  window.confirmarPagamentoEFinalizar();
};

window.handleBookingSubmit = (e) => {
  if (e && e.preventDefault) e.preventDefault();
  window.openBookingDataModal();
};

// Global Termos Modal Trigger
window.openTermosModal = (e) => {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  window.openTermosCompletosModal(e);
};

window.closeTermosModal = (e) => {
  if (e && e.preventDefault) e.preventDefault();
  window.closeDocViewerModal('modalTermosCompletos');
  const modal = document.getElementById('termosResponsabilidadeModal');
  if (modal) modal.style.display = 'none';
  const dataModal = document.getElementById('bookingDataModal');
  if (!dataModal || dataModal.style.display === 'none') {
    document.body.style.overflow = '';
  }
};

// ============================================================================
// 10. GALERIA DINÂMICA DAS SALAS (IMAGENS E VÍDEOS POR UPLOAD)
// ============================================================================
export async function initSalasGallery() {
  const container1 = document.getElementById('mediaSala1');
  const container2 = document.getElementById('mediaSala2');
  const container3 = document.getElementById('mediaSala3');
  if (!container1 && !container2 && !container3) return;

  try {
    let items = [];
    if (isSupabaseConfigured) {
      try {
        items = await getGaleriaSupabase();
      } catch (sbErr) {
        console.warn('Fallback Supabase galeria:', sbErr);
      }
    }

    if ((!items || items.length === 0) && db) {
      try {
        const q = query(collection(db, 'galeria'), orderBy('criadoEm', 'desc'));
        const snap = await getDocs(q);
        items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (orderErr) {
        // Fallback sem ordenação caso o índice ainda esteja sincronizando
        try {
          const snap = await getDocs(collection(db, 'galeria'));
          items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (innerErr) {
          console.warn('Fallback busca Firestore galeria:', innerErr);
        }
      }
    }

    renderMediaParaSala(container1, 'sala-red', items || [], 'Sala 1 (Sala Red)', 'var(--room-red)');
    renderMediaParaSala(container2, 'sala-green', items || [], 'Sala 2 (Sala Green)', 'var(--room-green)');
    renderMediaParaSala(container3, 'sala-blue', items || [], 'Sala 3 (Sala Blue)', 'var(--room-blue)');
  } catch (err) {
    console.warn('Erro ao carregar mídias da galeria das salas:', err);
  }
}

function renderMediaParaSala(container, salaId, allItems, roomLabel, roomColor) {
  if (!container) return;

  const roomItems = allItems.filter(m => {
    if (m.ativo === false) return false;
    if (m.sala === salaId) return true;
    const tag = (m.tag || '').toLowerCase();
    const titulo = (m.titulo || '').toLowerCase();
    if (salaId === 'sala-red' && (m.sala === 'sala-1' || tag.includes('red') || tag.includes('sala 1') || titulo.includes('sala 1') || titulo.includes('sala red'))) return true;
    if (salaId === 'sala-green' && (m.sala === 'sala-2' || tag.includes('green') || tag.includes('sala 2') || titulo.includes('sala 2') || titulo.includes('sala green'))) return true;
    if (salaId === 'sala-blue' && (m.sala === 'sala-3' || tag.includes('blue') || tag.includes('sala 3') || titulo.includes('sala 3') || titulo.includes('sala blue'))) return true;
    return false;
  });

  // Ordena pela ordem definida no painel administrativo (1, 2, 3...)
  roomItems.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

  if (roomItems.length === 0) {
    container.innerHTML = `
      <div class="media-placeholder-content">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color: ${roomColor}; opacity: 0.85;">
          <rect x="2" y="2" width="20" height="20" rx="4" ry="4"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span class="room-empty-hint">Nenhuma foto ou vídeo cadastrado ainda para a <strong>${roomLabel}</strong>.</span>
        <span style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">As fotos e vídeos desta sala serão exibidos aqui após o upload no painel administrativo.</span>
      </div>
    `;
    return;
  }

  const videos = roomItems.filter(m => m.tipo === 'video');
  const fotos = roomItems.filter(m => m.tipo !== 'video');

  let html = '';

  if (videos.length > 0) {
    html += `
      <div class="room-media-section-block">
        <div class="room-media-section-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          <span>Vídeos da Sala (${videos.length})</span>
        </div>
        <div class="room-videos-grid">
          ${videos.map(v => `
            <div class="room-video-card">
              <video controls playsinline preload="metadata" src="${v.url}" class="room-video-element"></video>
              ${v.titulo ? `<div class="room-media-caption">${v.titulo}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (fotos.length > 0) {
    html += `
      <div class="room-media-section-block" style="${videos.length > 0 ? 'margin-top: 24px;' : ''}">
        <div class="room-media-section-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span>Fotos da Sala (${fotos.length})</span>
        </div>
        <div class="room-photos-grid">
          ${fotos.map(f => {
            const escapedTitle = (f.titulo || '').replace(/'/g, "\\'");
            return `
              <div class="room-photo-card" onclick="window.openRoomLightbox('${f.url}', '${escapedTitle}', 'imagem')">
                <img src="${f.url}" alt="${f.titulo || 'Foto da sala'}" loading="lazy" class="room-photo-element">
                <div class="room-photo-overlay">
                  <span class="room-photo-zoom-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  </span>
                  ${f.titulo ? `<span class="room-photo-caption-text">${f.titulo}</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// Lightbox Global para Visualização Ampliada de Imagens e Vídeos
window.openRoomLightbox = (url, caption = '', tipo = 'imagem') => {
  const modal = document.getElementById('roomLightboxModal');
  const imgEl = document.getElementById('roomLightboxImage');
  const vidEl = document.getElementById('roomLightboxVideo');
  const capEl = document.getElementById('roomLightboxCaption');
  if (!modal) return;

  if (tipo === 'video') {
    if (imgEl) imgEl.style.display = 'none';
    if (vidEl) {
      vidEl.style.display = 'block';
      vidEl.src = url;
      vidEl.play().catch(() => {});
    }
  } else {
    if (vidEl) {
      vidEl.pause();
      vidEl.style.display = 'none';
      vidEl.src = '';
    }
    if (imgEl) {
      imgEl.style.display = 'block';
      imgEl.src = url;
    }
  }

  if (capEl) capEl.textContent = caption || '';
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('open'));
};

window.closeRoomLightbox = (e) => {
  if (e && e.stopPropagation) e.stopPropagation();
  const modal = document.getElementById('roomLightboxModal');
  const vidEl = document.getElementById('roomLightboxVideo');
  if (modal) {
    modal.classList.remove('open');
    if (vidEl) {
      vidEl.pause();
      vidEl.src = '';
    }
    setTimeout(() => { modal.style.display = 'none'; }, 250);
  }
};

/**
 * Sincroniza dados oficiais (Supabase com fallback para Firestore) para o site público em tempo real
 */
async function loadPublicDataFromFirestore() {
  if (!db && !isSupabaseConfigured) return;

  try {
    // 1. Configurações Gerais (WhatsApp Oficial e PDF do Cardápio)
    try {
      let conf = null;
      if (isSupabaseConfigured) {
        try {
          conf = await getConfiguracoesSupabase();
        } catch (e) {
          console.warn('Sync configs Supabase:', e);
        }
      }
      if (!conf && db) {
        const confSnap = await getDoc(doc(db, 'configuracoes', 'geral'));
        if (confSnap.exists()) {
          conf = confSnap.data();
        }
      }

      if (conf) {
        if (conf.whatsapp) {
          const cleanPhone = conf.whatsapp.replace(/\D/g, '');
          if (cleanPhone) {
            WHATSAPP_PHONE = cleanPhone;
            document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
              const oldUrl = link.href;
              const textMatch = oldUrl.match(/text=([^&]+)/);
              const textParam = textMatch ? textMatch[1] : '';
              link.href = `https://wa.me/${cleanPhone}${textParam ? '?text=' + textParam : ''}`;
            });
          }
        }
        if (conf.pdfUrl) {
          document.querySelectorAll('a[href*="cardapio-oficial.pdf"], #verCardapioPdfMainBtn').forEach(link => {
            link.href = conf.pdfUrl;
          });
        }
      }
    } catch(e) {
      console.warn('Sync configs público:', e);
    }

    // 2. Bloqueios de Calendário (Disponibilidade)
    try {
      let bloqueios = [];
      if (isSupabaseConfigured) {
        try {
          bloqueios = await getBloqueiosSupabase();
        } catch (e) {
          console.warn('Sync bloqueios Supabase:', e);
        }
      }
      if ((!bloqueios || bloqueios.length === 0) && db) {
        const bSnap = await getDocs(collection(db, 'bloqueios'));
        if (!bSnap.empty) {
          bloqueios = bSnap.docs.map(d => d.data());
        }
      }
      if (bloqueios && bloqueios.length > 0) {
        activeBlockedDates = bloqueios;
        renderCalendar();
      }
    } catch(e) {
      console.warn('Sync bloqueios público:', e);
    }

    // 3. Salas (Valores, Capacidades e Descrições)
    try {
      let salas = [];
      if (isSupabaseConfigured) {
        try {
          salas = await getSalasSupabase();
        } catch (e) {
          console.warn('Sync salas Supabase:', e);
        }
      }
      if ((!salas || salas.length === 0) && db) {
        const sSnap = await getDocs(collection(db, 'salas'));
        if (!sSnap.empty) {
          salas = sSnap.docs.map(d => d.data());
        }
      }
      if (salas && salas.length > 0) {
        salas.forEach(s => {
          const card = document.querySelector(`.room-pick-card[data-room="${s.nome}"]`);
          if (card) {
            if (s.capacidade) {
              card.setAttribute('data-capacity', s.capacidade);
              const capBadge = card.querySelector('.room-cap-badge');
              if (capBadge) capBadge.textContent = `Até ${s.capacidade} pessoas`;
            }
            if (s.precoTotal) {
              const preco = Number(s.precoTotal);
              card.setAttribute('data-price', preco);
              card.setAttribute('data-signal', preco / 2);
              const totalVal = card.querySelector('.total-val');
              if (totalVal) totalVal.textContent = `R$ ${preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
              const signalVal = card.querySelector('.signal-val');
              if (signalVal) signalVal.textContent = `Sinal 50%: R$ ${(preco / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • No dia: R$ ${(preco / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
            if (s.descricao) {
              const descEl = card.querySelector('.room-pick-desc');
              if (descEl) descEl.textContent = s.descricao;
            }
            if (s.ativo === false) {
              card.style.opacity = '0.5';
              card.style.pointerEvents = 'none';
            }
          }
        });
      }
    } catch(e) {
      console.warn('Sync salas público:', e);
    }

    // 4. Cardápio Oficial (Sincronização em cardapio.html)
    if (document.querySelector('.cardapio-page-view') || document.getElementById('cardapio')) {
      try {
        let items = [];
        if (isSupabaseConfigured) {
          try {
            items = await getCardapioSupabase();
          } catch(e) {
            console.warn('Sync cardapio Supabase:', e);
          }
        }
        if ((!items || items.length === 0) && db) {
          const cSnap = await getDocs(collection(db, 'cardapio'));
          if (!cSnap.empty) {
            items = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          }
        }

        if (items && items.length > 0) {
          items.forEach(it => {
            const allItemRows = document.querySelectorAll('.menu-item-row');
            let matchedRow = null;
            allItemRows.forEach(row => {
              const nameEl = row.querySelector('.item-name');
              if (nameEl && nameEl.textContent.trim().toLowerCase() === (it.nome || '').trim().toLowerCase()) {
                matchedRow = row;
              }
            });

            if (matchedRow) {
              if (it.ativo === false) {
                matchedRow.style.display = 'none';
              } else {
                matchedRow.style.display = 'flex';
                if (it.preco) {
                  const priceEl = matchedRow.querySelector('.item-price');
                  if (priceEl) priceEl.textContent = `R$ ${Number(it.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                }
                if (it.descricao) {
                  const descEl = matchedRow.querySelector('.item-desc');
                  if (descEl) descEl.textContent = it.descricao;
                }
              }
            } else if (it.ativo !== false && it.nome) {
              const targetPanel = document.getElementById(`cat-${it.categoriaId || 'petiscos'}`);
              const grid = targetPanel ? targetPanel.querySelector('.menu-items-grid') : null;
              if (grid) {
                const newRow = document.createElement('div');
                newRow.className = 'menu-item-row';
                newRow.innerHTML = `
                  <div class="item-left">
                    <div class="item-name">${it.nome}</div>
                    <div class="item-desc">${it.descricao || ''}</div>
                  </div>
                  <div class="item-price">R$ ${(Number(it.preco) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                `;
                grid.appendChild(newRow);
              }
            }
          });
        }
      } catch(e) {
        console.warn('Sync cardapio público:', e);
      }
    }
  } catch(err) {
    console.warn('Sync público geral:', err);
  }
}

// Inicialização imediata ao final do script garantindo que todo o escopo está carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
