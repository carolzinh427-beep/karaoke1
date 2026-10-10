/**
 * Backstage Karaokê - Interactive Application Script
 */

import { initKaraokeMap } from './mapa/KaraokeMap.js';
import { salvarAgendamento, db } from './lib/firebase.js';
import { collection, getDocs, doc, getDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  supabase,
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
  checkPaymentStatus,
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
import {
  ROOM_DATA,
  calcularPrecoSalaPrivada
} from './lib/salasPrivadas.js';

export { ROOM_DATA, calcularPrecoSalaPrivada };

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
let selectedBookingHorario = '19:00';
let currentBookingStep = 1;
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();

// Estado do Mapa e Calendário do Salão Principal
let selectedMesaId = 'mesa-30';
let selectedReservaData = null; // { dateStr: 'YYYY-MM-DD', formattedDisplay: 'Quarta, 07/10/2026' }
let selectedReservaHorario = '20:00';
let selectedCheckoutHorario = '19:00';
let selectedMetodoTarifa = 'pix'; // 'pix' | 'debito' | 'credito'
let modalCalYear = new Date().getFullYear();
let modalCalMonth = new Date().getMonth();
let reservasOcupadas = [];
let activeConfirmedReservation = null;

if (typeof window !== 'undefined') {
  window.selectedBookingHorario = selectedBookingHorario;
  window.selectedCheckoutHorario = selectedCheckoutHorario;
}

// Estado de Sessão e Monitoramento de Pagamento Asaas (Anti-Falso Positivo)
let currentPaymentSession = null;
let currentReservaPendente = null;
let paymentPollingTimer = null;

function pararMonitoramentoPagamento() {
  if (paymentPollingTimer) {
    clearInterval(paymentPollingTimer);
    paymentPollingTimer = null;
  }
}

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
  try { syncPromocoesCards(); } catch(e) { console.warn('syncPromocoesCards error:', e); }
  try { loadPublicDataFromFirestore(); } catch(e) { console.warn('loadPublicDataFromFirestore error:', e); }
  try { initRealtimeListeners(); } catch(e) { console.warn('initRealtimeListeners error:', e); }
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
// ROOM_DATA e calcularPrecoSalaPrivada são importados de ./lib/salasPrivadas.js


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

        // Atualiza resumos nos passos e modais
        const step2Date = document.getElementById('step2DateSummary');
        if (step2Date) step2Date.textContent = formattedDisplay;

        const modalDate = document.getElementById('modalDateBadge');
        if (modalDate) modalDate.textContent = `📅 ${formattedDisplay}`;

        const summaryDate = document.getElementById('summaryDateVal');
        if (summaryDate) summaryDate.textContent = formattedDisplay;

        // Vai direto para o Passo 2 (Escolha da Sala) e rola direto para as salas
        window.goToBookingStep(2, true);
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
window.goToBookingStep = (step, directToTarget = false) => {
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

  // Scroll suave direto para o alvo de conteúdo (sem parar no título da sessão)
  if (step === 2) {
    const roomsGrid = document.getElementById('stepRoomsGrid');
    if (roomsGrid) {
      roomsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } else if (step === 3) {
    const step3El = document.getElementById('bookingStep3');
    if (step3El) {
      step3El.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } else {
    const cal = document.getElementById('bookingCalendar');
    if (cal) {
      cal.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

// Pop-up Exclusivo por Sala ("Você quer me locar?", etc)
window.openRoomPersonalityModal = (roomName) => {
  const room = ROOM_DATA[roomName];
  if (!room) return;

  pendingRoomSelection = roomName;
  selectedBookingRoom = roomName;

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
  if (signalEl) signalEl.textContent = 'Pagamento Único';
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
    if (summarySignal && room) summarySignal.textContent = 'Pagamento Único • Reembolso garantido';
    if (pessoasInput && room) {
      pessoasInput.max = room.capacidadeNum;
      pessoasInput.placeholder = `Ex: ${Math.round(room.capacidadeNum * 0.7)} convidados (máx: ${room.capacidadeNum})`;
    }
  }

  // Transição direta para o Passo 3 (Preencher Dados)
  window.closeRoomPersonalityModal();
  window.goToBookingStep(3);
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
  const todasReservas = [];

  // 1. Carrega do Supabase
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await (await import('./lib/supabase.js')).getReservasSupabase();
      if (!error && Array.isArray(data)) {
        todasReservas.push(...data);
      }
    }
  } catch (e) {
    console.warn('Consulta reservas ocupadas Supabase:', e);
  }

  // 2. Carrega do Firestore (reservas e agendamentos)
  try {
    if (db) {
      const snapRes = await getDocs(collection(db, 'reservas'));
      snapRes.forEach(docSnap => {
        todasReservas.push({ id: docSnap.id, ...docSnap.data() });
      });
      const snapAg = await getDocs(collection(db, 'agendamentos'));
      snapAg.forEach(docSnap => {
        todasReservas.push({ id: docSnap.id, ...docSnap.data() });
      });
    }
  } catch (e) {
    console.warn('Consulta reservas ocupadas Firestore:', e);
  }

  // Deduplicação e filtragem de ativas
  const seenIds = new Set();
  reservasOcupadas = todasReservas.filter(r => {
    const key = r.id || `${r.data}_${r.salaOuMesa || r.sala}_${r.whatsapp}`;
    if (seenIds.has(key)) return false;
    seenIds.add(key);
    const st = (r.status || '').toUpperCase();
    return st !== 'CANCELLED' && st !== 'CANCELADO';
  });

  atualizarStatusMesasNoMapa();
}

function isMesaReservada(mesaId, dataStr, horarioStr) {
  if (!reservasOcupadas || !reservasOcupadas.length) return false;

  const numOnly = mesaId.replace(/\D/g, '');
  const targetId = `mesa-${numOnly}`.toLowerCase();
  const targetName = `mesa ${numOnly}`.toLowerCase();

  return reservasOcupadas.some(r => {
    const rMesa = (r.salaOuMesa || r.sala || r.mesaId || '').toLowerCase();
    const rMesaId = (r.mesaId || '').toLowerCase();
    const rMesaNum = String(r.mesaNumero || '');

    const matchesMesa = 
      rMesa.includes(targetId) ||
      rMesa.includes(targetName) ||
      rMesaId === targetId ||
      rMesaNum === numOnly;

    if (!matchesMesa) return false;

    // Se data for especificada, valida data
    if (dataStr) {
      const rData = r.data || r.dataReserva || '';
      if (rData && !rData.includes(dataStr) && !(selectedReservaData && rData.includes(selectedReservaData.formattedDisplay))) {
        return false;
      }
    }

    // Se horário for especificado, valida horário
    if (horarioStr) {
      const rHora = r.horario || '';
      if (rHora && rHora !== horarioStr) {
        return false;
      }
    }

    return true;
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
  const container = document.getElementById('modalTablesListScroll');
  if (!container) return;

  container.innerHTML = MESAS_SALAO.map(mesa => {
    const isSelected = selectedMesaId === mesa.id;
    const reserved = isMesaReservada(mesa.id, selectedReservaData ? selectedReservaData.dateStr : null, null);

    return `
      <div class="table-selection-card ${isSelected ? 'selected' : ''} ${reserved ? 'reserved' : ''}"
           role="button"
           tabindex="${reserved ? '-1' : '0'}"
           onclick="window.selecionarMesaNoModal('${mesa.id}')">
        <div class="table-card-info-main">
          <strong>${mesa.nomeExibicao} (${mesa.rotuloCapacidade})</strong>
          <span>${mesa.localizacao}</span>
        </div>
        <div class="table-card-actions-wrap" style="display: flex; align-items: center; gap: 8px;">
          ${reserved ? `
            <button type="button" class="btn btn-xs table-quick-book-btn table-btn-unavailable" disabled>
              Indisponível
            </button>
          ` : `
            <button type="button" class="btn btn-primary btn-xs table-quick-book-btn" onclick="event.stopPropagation(); window.selecionarMesaNoModal('${mesa.id}')">
              ${isSelected ? '✓ Escolhida' : 'Escolher'}
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

window.selecionarMesaNoModal = (mesaId) => {
  selectedBookingRoom = null;
  const mesa = getMesaById(mesaId);
  if (!mesa) return;

  selectedMesaId = mesaId;
  const btnAvancarData = document.getElementById('btnAvancarParaData');
  if (btnAvancarData) btnAvancarData.disabled = false;

  const promptTxt = document.getElementById('modalMesaSelectPrompt');
  if (promptTxt) promptTxt.textContent = `✓ ${mesa.nomeExibicao} selecionada!`;

  renderListaMesasNoModal();

  // Atualiza etiquetas informativas nos modais
  const badgeMesa = document.getElementById('modalBadgeMesaEscolhida');
  const badgeMesa2 = document.getElementById('modalBadgeMesaEscolhida2');
  const badgeMesa3 = document.getElementById('modalBadgeMesaEscolhida3');
  const capTag = document.getElementById('modalMesaCapacidadeTag');
  const capHelper = document.getElementById('modalCapacidadeHelper');
  const inputPessoas = document.getElementById('modalBookingPessoas');

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
};

function atualizarStatusMesasNoMapa() {
  if (window.karaokeMapInstance) {
    const mapInst = window.karaokeMapInstance;
    const dateToCheck = selectedReservaData ? selectedReservaData.dateStr : null;

    mapInst.tables.forEach(t => {
      const reserved = isMesaReservada(t.id, dateToCheck, null);
      if (reserved) {
        mapInst.setTableStatus(t.id, 'reservada');
      } else if (t.status === 'reservada') {
        mapInst.setTableStatus(t.id, 'disponivel');
      }
    });

    mapInst.updateTablesList();
  }
}

// Sincronização em tempo real quando uma mesa for reservada
window.addEventListener('mesaReservadaConfirmada', (e) => {
  if (e.detail) {
    reservasOcupadas.push(e.detail);
    atualizarStatusMesasNoMapa();
  }
});

// ----------------------------------------------------------------------------
// FLUXO DE SELEÇÃO E RESERVA DE MESA
// ----------------------------------------------------------------------------

// 1. Cliente clica na mesa desejada no mapa
window.selecionarMesaNoMapa = (mesaId, isFromPageMap = false) => {
  selectedBookingRoom = null; // Garante que a seleção de mesa limpa qualquer sala privada

  // Se o modal de checkout já estiver aberto, seleciona internamente nele
  const modal = document.getElementById('bookingDataModal');
  if (modal && modal.style.display !== 'none' && !isFromPageMap) {
    window.selecionarMesaNoModal(mesaId);
    return;
  }

  if (window.karaokeMapInstance) {
    window.karaokeMapInstance.handleTableClick(mesaId);
    return;
  }
  const mesa = getMesaById(mesaId);
  if (!mesa) return;

  selectedMesaId = mesaId;
  atualizarStatusMesasNoMapa();
  window.selecionarMesaNoModal(mesaId);

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
  selectedBookingRoom = null;
  window.abrirModalNoPasso(1);
};

window.abrirModalNoPasso = (passo = 1) => {
  const modal = document.getElementById('bookingDataModal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (passo === 1) {
    selectedBookingRoom = null;
    window.voltarParaPassoMesa();
  } else if (passo === 2) {
    window.avancarParaPassoData();
  }
};

window.closeBookingDataModal = () => {
  pararMonitoramentoPagamento();
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
  renderListaMesasNoModal();
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
  atualizarStatusMesasNoMapa();

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

  if (!selectedMesaId) {
    selectedMesaId = 'mesa-1';
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
  if (selectedBookingRoom) {
    window.closeBookingDataModal();
    const step3 = document.getElementById('bookingStep3') || document.getElementById('reservar');
    if (step3) {
      step3.style.display = 'block';
      step3.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }
  alternarSecaoFluxo('chkSectionDados', 4);
};

window.mostrarResumoEPagamento = () => {
  alternarSecaoFluxo('chkSectionResumo', 6);

  const isSalaPrivada = Boolean(selectedBookingRoom);
  const room = isSalaPrivada ? (ROOM_DATA[selectedBookingRoom] || (pendingRoomSelection ? ROOM_DATA[pendingRoomSelection] : null) || ROOM_DATA['Sala Green']) : null;
  const mesa = isSalaPrivada ? null : getMesaById(selectedMesaId);

  // Sincronização e recuperação bidirecional de dados cadastrais
  let nome = document.getElementById('modalBookingNome')?.value?.trim() ||
             (isSalaPrivada ? document.getElementById('bookingNome')?.value?.trim() : '') || '';
  if (!nome) {
    try { nome = localStorage.getItem('bk_cliente_nome') || ''; } catch (e) {}
  }
  if (nome) {
    const mn = document.getElementById('modalBookingNome');
    const bn = document.getElementById('bookingNome');
    if (mn && !mn.value) mn.value = nome;
    if (bn && !bn.value) bn.value = nome;
  }

  let whatsapp = document.getElementById('modalBookingWhatsapp')?.value?.trim() ||
                 (isSalaPrivada ? document.getElementById('bookingWhatsapp')?.value?.trim() : '') || '';
  if (!whatsapp) {
    try { whatsapp = localStorage.getItem('bk_cliente_zap') || ''; } catch (e) {}
  }
  if (whatsapp) {
    const mz = document.getElementById('modalBookingWhatsapp');
    const bz = document.getElementById('bookingWhatsapp');
    if (mz && !mz.value) mz.value = whatsapp;
    if (bz && !bz.value) bz.value = whatsapp;
  }

  let email = document.getElementById('modalBookingEmail')?.value?.trim() ||
              (isSalaPrivada ? document.getElementById('bookingEmail')?.value?.trim() : '') || '';
  if (!email) {
    try { email = localStorage.getItem('bk_cliente_email') || ''; } catch (e) {}
  }
  if (email) {
    const me = document.getElementById('modalBookingEmail');
    const be = document.getElementById('bookingEmail');
    if (me && !me.value) me.value = email;
    if (be && !be.value) be.value = email;
  }

  const mPessoasVal = document.getElementById('modalBookingPessoas')?.value;
  const bPessoasVal = document.getElementById('bookingPessoas')?.value;
  let pessoas = parseInt(mPessoasVal || (isSalaPrivada ? bPessoasVal : '') || '0', 10);
  if (isNaN(pessoas) || pessoas < 0) {
    pessoas = 0;
  }
  const mp = document.getElementById('modalBookingPessoas');
  const bp = document.getElementById('bookingPessoas');
  if (mp && (!mp.value || mp.value === '0') && pessoas > 0) mp.value = pessoas;
  if (bp && (!bp.value || bp.value === '0') && pessoas > 0) bp.value = pessoas;

  // Stepper: oculta no fluxo de sala privada e exibe no fluxo de mesas
  const stepper = document.getElementById('checkoutFlowStepper');
  if (stepper) {
    stepper.style.display = isSalaPrivada ? 'none' : 'flex';
  }

  // Preenche dados do Passo 6 (Resumo) e Passo 8 (Pagar)
  const tituloSecao = document.getElementById('chkResumoTitulo');
  const subtituloSecao = document.getElementById('chkResumoSubtitulo');
  const resumoTipoLabel = document.getElementById('resumoTipoItemLabel');
  const resumoPagarTipoLabel = document.getElementById('resumoPagarTipoLabel');
  const resumoMesa = document.getElementById('resumoMesaNome');
  const resumoPagarMesa = document.getElementById('resumoPagarMesaNome');
  const resumoDataHora = document.getElementById('resumoDataHora');
  const resumoPagarDataHora = document.getElementById('resumoPagarDataHora');
  const resumoTitular = document.getElementById('resumoTitularNome');
  const resumoPagarTitular = document.getElementById('resumoPagarTitularNome');
  const resumoQtd = document.getElementById('resumoQtdPessoas');
  const resumoPagarQtd = document.getElementById('resumoPagarQtdPessoas');
  const resumoQtdLabel = document.getElementById('resumoQtdLabel');
  const resumoPagarQtdLabel = document.getElementById('resumoPagarQtdLabel');
  const btnVoltar = document.getElementById('btnVoltarDoResumo');
  const boxMesa = document.getElementById('boxPagamentoMesa');
  const boxSala = document.getElementById('boxPagamentoSala');

  if (isSalaPrivada) {
    // Salas Privadas: Isola e esconde totalmente qualquer parte de entrada/por pessoa
    if (boxMesa) boxMesa.style.display = 'none';
    if (boxSala) boxSala.style.display = 'block';

    const boxCancel = document.getElementById('boxPoliticaCancelamentoResumo');
    if (boxCancel) boxCancel.style.display = 'block';
    const chkCancel = document.getElementById('chkPoliticaCancelamentoAceita');
    const chkFormCancel = document.getElementById('bookingCancelamentoCheck');
    if (chkCancel && chkFormCancel && chkFormCancel.checked) {
      chkCancel.checked = true;
    }

    if (tituloSecao) tituloSecao.textContent = 'Resumo da Sala Privada & Pagamento';
    if (subtituloSecao) subtituloSecao.textContent = 'O valor da sala privativa é fixo e integral para o espaço completo (não cobramos por pessoa nas salas):';
    
    const salaNomeExibicao = room ? `${room.name} (${room.capacidade})` : 'Sala Green (Até 40 pessoas)';
    if (resumoTipoLabel) resumoTipoLabel.textContent = 'Sala Escolhida:';
    if (resumoPagarTipoLabel) resumoPagarTipoLabel.textContent = 'Sala Escolhida:';
    if (resumoMesa) {
      resumoMesa.textContent = salaNomeExibicao;
      resumoMesa.style.color = room ? room.themeColor : '#00E699';
    }
    if (resumoPagarMesa) {
      resumoPagarMesa.textContent = salaNomeExibicao;
      resumoPagarMesa.style.color = room ? room.themeColor : '#00E699';
    }

    const dataTxt = selectedBookingDate ? selectedBookingDate.formattedDisplay : '';
    const horaTxt = selectedBookingHorario || '19:00';
    const dataHoraStr = dataTxt ? `${dataTxt} às ${horaTxt}` : `Data a definir às ${horaTxt}`;
    if (resumoDataHora) resumoDataHora.textContent = dataHoraStr;
    if (resumoPagarDataHora) resumoPagarDataHora.textContent = dataHoraStr;

    const titularStr = nome || 'Nome pendente de preenchimento';
    if (resumoTitular) resumoTitular.textContent = titularStr;
    if (resumoPagarTitular) resumoPagarTitular.textContent = titularStr;

    if (resumoQtdLabel) resumoQtdLabel.textContent = 'Quantidade de Convidados:';
    if (resumoPagarQtdLabel) resumoPagarQtdLabel.textContent = 'Quantidade de Convidados:';
    const maxCap = room ? room.capacidadeNum : 40;
    const qtdConvidadosStr = pessoas > 0 ? `${pessoas} convidados (Máx: ${maxCap})` : `Pendente de preenchimento (Máx: ${maxCap})`;
    if (resumoQtd) resumoQtd.textContent = qtdConvidadosStr;
    if (resumoPagarQtd) resumoPagarQtd.textContent = qtdConvidadosStr;

    if (btnVoltar) btnVoltar.textContent = '← Voltar para Reserva da Sala';
  } else {
    // Mesas do Salão: Entrada cobrada por pessoa
    if (boxMesa) boxMesa.style.display = 'block';
    if (boxSala) boxSala.style.display = 'none';

    const boxCancel = document.getElementById('boxPoliticaCancelamentoResumo');
    if (boxCancel) boxCancel.style.display = 'none';

    if (tituloSecao) tituloSecao.textContent = '5. Resumo da Reserva & Forma de Pagamento';
    if (subtituloSecao) subtituloSecao.textContent = 'Revise os dados da reserva e escolha sua forma de pagamento por pessoa:';
    
    const mesaNomeExibicao = mesa ? `${mesa.nomeExibicao} (${mesa.rotuloCapacidade})` : 'Mesa Salão';
    if (resumoTipoLabel) resumoTipoLabel.textContent = 'Mesa Escolhida:';
    if (resumoPagarTipoLabel) resumoPagarTipoLabel.textContent = 'Mesa Escolhida:';
    if (resumoMesa) {
      resumoMesa.textContent = mesaNomeExibicao;
      resumoMesa.style.color = '#F59E0B';
    }
    if (resumoPagarMesa) {
      resumoPagarMesa.textContent = mesaNomeExibicao;
      resumoPagarMesa.style.color = '#F59E0B';
    }

    const horaMesa = selectedCheckoutHorario || selectedReservaHorario || '19:00';
    const dataHoraMesa = `${selectedReservaData ? selectedReservaData.formattedDisplay : 'Data a definir'} às ${horaMesa}`;
    if (resumoDataHora) resumoDataHora.textContent = dataHoraMesa;
    if (resumoPagarDataHora) resumoPagarDataHora.textContent = dataHoraMesa;

    const titularStrMesa = nome || 'Nome pendente de preenchimento';
    if (resumoTitular) resumoTitular.textContent = titularStrMesa;
    if (resumoPagarTitular) resumoPagarTitular.textContent = titularStrMesa;

    if (resumoQtdLabel) resumoQtdLabel.textContent = 'Quantidade:';
    if (resumoPagarQtdLabel) resumoPagarQtdLabel.textContent = 'Quantidade:';
    const qtdPessoasMesaStr = pessoas > 0 ? `${pessoas} pessoa(s)` : 'Quantidade a definir';
    if (resumoQtd) resumoQtd.textContent = qtdPessoasMesaStr;
    if (resumoPagarQtd) resumoPagarQtd.textContent = qtdPessoasMesaStr;

    if (btnVoltar) btnVoltar.textContent = '← Voltar para Seus Dados';
  }

  // Atualiza valores conforme o método ativo (Passo 7)
  window.selecionarMetodoTarifa(selectedMetodoTarifa || 'pix');
};

// 7. Cliente escolhe o pagamento
// - Salas privadas: valor único da sala inteira (Pix, Débito e Crédito sem taxa e sem valor por pessoa).
//   Sala Green = R$ 900,00 | Sala Red = R$ 800,00 | Sala Blue = R$ 1.000,00
// - Reserva de mesa: apenas valores individuais por pessoa (R$ 20 Pix/Débito, R$ 25 Crédito).
window.selecionarMetodoTarifa = (metodo = 'pix') => {
  selectedMetodoTarifa = (metodo || 'pix').toLowerCase();
  const isSalaPrivada = Boolean(selectedBookingRoom);

  const boxMesa = document.getElementById('boxPagamentoMesa');
  const boxSala = document.getElementById('boxPagamentoSala');

  // Toggle visual nos cards de Mesa
  const cardPixMesa = document.getElementById('payCardPixMesa');
  const cardDebitoMesa = document.getElementById('payCardDebitoMesa');
  const cardCreditoMesa = document.getElementById('payCardCreditoMesa');
  if (cardPixMesa) cardPixMesa.classList.toggle('selected', selectedMetodoTarifa === 'pix');
  if (cardDebitoMesa) cardDebitoMesa.classList.toggle('selected', selectedMetodoTarifa === 'debito');
  if (cardCreditoMesa) cardCreditoMesa.classList.toggle('selected', selectedMetodoTarifa === 'credito');

  // Toggle visual nos cards de Sala
  const cardPixSala = document.getElementById('payCardPixSala');
  const cardDebitoSala = document.getElementById('payCardDebitoSala');
  const cardCreditoSala = document.getElementById('payCardCreditoSala');
  if (cardPixSala) cardPixSala.classList.toggle('selected', selectedMetodoTarifa === 'pix');
  if (cardDebitoSala) cardDebitoSala.classList.toggle('selected', selectedMetodoTarifa === 'debito');
  if (cardCreditoSala) cardCreditoSala.classList.toggle('selected', selectedMetodoTarifa === 'credito');

  const totalEl = document.getElementById('resumoValorTotalCalculado');
  const formulaEl = document.getElementById('resumoCalculoFormula');
  const pagarValor = document.getElementById('pagarValorDisplay');
  const pagarMetodo = document.getElementById('pagarMetodoDisplay');
  const nomeMetodo = selectedMetodoTarifa === 'pix' ? 'Pix' : selectedMetodoTarifa === 'debito' ? 'Débito' : 'Crédito';

  if (isSalaPrivada) {
    // Garante que o bloco de mesas permaneça 100% oculto
    if (boxMesa) boxMesa.style.display = 'none';
    if (boxSala) boxSala.style.display = 'block';

    // Cálculo específico para Sala Privada: valor fixo integral da sala inteira
    const calcPix = calcularPrecoSalaPrivada(selectedBookingRoom, 'pix');
    const calcDebito = calcularPrecoSalaPrivada(selectedBookingRoom, 'debito');
    const calcCredito = calcularPrecoSalaPrivada(selectedBookingRoom, 'credito');
    const calcAtual = calcularPrecoSalaPrivada(selectedBookingRoom, selectedMetodoTarifa);

    const ratePixSala = document.getElementById('payCardPixSalaRate');
    const rateDebitoSala = document.getElementById('payCardDebitoSalaRate');
    const rateCreditoSala = document.getElementById('payCardCreditoSalaRate');

    if (ratePixSala) ratePixSala.textContent = calcPix.formatadoCobrado;
    if (rateDebitoSala) rateDebitoSala.textContent = calcDebito.formatadoCobrado;
    if (rateCreditoSala) rateCreditoSala.textContent = calcCredito.formatadoCobrado;

    // Atualiza valor total e fórmula (preço fixo integral da sala escolhida)
    if (totalEl) totalEl.textContent = calcAtual.formatadoCobrado;
    if (pagarValor) pagarValor.textContent = calcAtual.formatadoCobrado;

    const descSala = `${calcAtual.nome} • Preço fixo total da sala: ${calcAtual.formatadoCobrado} (Pagamento integral da sala completa, sem cobrança por pessoa)`;
    if (formulaEl) formulaEl.textContent = descSala;
    if (pagarMetodo) {
      pagarMetodo.textContent = `Pagamento Integral da Sala via ${nomeMetodo} (Preço fixo total: ${calcAtual.formatadoCobrado})`;
    }
  } else {
    // Garante que o bloco de salas permaneça 100% oculto
    if (boxMesa) boxMesa.style.display = 'block';
    if (boxSala) boxSala.style.display = 'none';

    // Cálculo específico para Mesa do Salão (apenas valores individuais)
    const pessoas = parseInt(document.getElementById('modalBookingPessoas')?.value || '4', 10);
    const calculo = calcularValorReserva(pessoas, selectedMetodoTarifa);

    const ratePixMesa = document.getElementById('payCardPixMesaRate');
    const rateDebitoMesa = document.getElementById('payCardDebitoMesaRate');
    const rateCreditoMesa = document.getElementById('payCardCreditoMesaRate');

    if (ratePixMesa) ratePixMesa.innerHTML = `R$ 20<span style="font-size: 0.72rem; font-weight: normal; color: var(--text-muted);">/pessoa</span>`;
    if (rateDebitoMesa) rateDebitoMesa.innerHTML = `R$ 20<span style="font-size: 0.72rem; font-weight: normal; color: var(--text-muted);">/pessoa</span>`;
    if (rateCreditoMesa) rateCreditoMesa.innerHTML = `R$ 25<span style="font-size: 0.72rem; font-weight: normal; color: var(--text-muted);">/pessoa</span>`;

    if (totalEl) totalEl.textContent = calculo.formatadoTotal;
    if (pagarValor) pagarValor.textContent = calculo.formatadoTotal;

    const descMesa = `${pessoas} pessoa(s) × ${calculo.formatadoUnitario} (${nomeMetodo})`;
    if (formulaEl) formulaEl.textContent = descMesa;
    if (pagarMetodo) {
      pagarMetodo.textContent = `Pagamento via ${nomeMetodo} (R$ ${calculo.valorUnitario}/pessoa)`;
    }
  }
};

// ----------------------------------------------------------------------------
// 8. Prossegue para o pagamento (Preparado para Asaas)
// ----------------------------------------------------------------------------
window.voltarParaPassoResumo = () => {
  pararMonitoramentoPagamento();
  alternarSecaoFluxo('chkSectionResumo', 6);
  window.mostrarResumoEPagamento();
};

window.avancarParaPassoPagar = async () => {
  const isSalaPrivada = Boolean(selectedBookingRoom);

  const chkTermos = document.getElementById('chkReservaTermosAceitos');
  if (chkTermos && !chkTermos.checked) {
    alert('É obrigatório concordar com os termos de compra e reserva para prosseguir.');
    return;
  }

  const chkCancelamento = document.getElementById('chkPoliticaCancelamentoAceita');
  const chkFormCancel = document.getElementById('bookingCancelamentoCheck');
  if (isSalaPrivada) {
    if (chkCancelamento && chkFormCancel && chkFormCancel.checked) {
      chkCancelamento.checked = true;
    }
    if (chkCancelamento && !chkCancelamento.checked) {
      alert('É obrigatório dar o aceite explícito na Política de Cancelamento (ciência de que 50% do valor da reserva corresponde à parcela que poderá não ser reembolsada em caso de cancelamento) para prosseguir com a reserva.');
      return;
    }
  }

  // Validação estrita de campos obrigatórios (sem inventar nome, data, horário ou quantidade)
  const nome = document.getElementById('modalBookingNome')?.value?.trim() || (isSalaPrivada ? document.getElementById('bookingNome')?.value?.trim() : '') || '';
  const whatsapp = document.getElementById('modalBookingWhatsapp')?.value?.trim() || (isSalaPrivada ? document.getElementById('bookingWhatsapp')?.value?.trim() : '') || '';
  const email = document.getElementById('modalBookingEmail')?.value?.trim() || (isSalaPrivada ? document.getElementById('bookingEmail')?.value?.trim() : '') || '';
  const pessoas = parseInt(document.getElementById('modalBookingPessoas')?.value || (isSalaPrivada ? document.getElementById('bookingPessoas')?.value : '') || '0', 10);

  if (!nome) {
    alert('Por favor, informe seu nome completo antes de prosseguir para o pagamento.');
    const inNome = document.getElementById('modalBookingNome') || document.getElementById('bookingNome');
    if (inNome) inNome.focus();
    return;
  }

  const cleanZap = (whatsapp || '').replace(/\D/g, '');
  if (!cleanZap || cleanZap.length < 10) {
    alert('Por favor, informe seu WhatsApp com DDD (10 ou 11 dígitos) antes de prosseguir para o pagamento.');
    const inZap = document.getElementById('modalBookingWhatsapp') || document.getElementById('bookingWhatsapp');
    if (inZap) inZap.focus();
    return;
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    alert('Por favor, informe um e-mail válido para envio do voucher e comprovante.');
    const inEmail = document.getElementById('modalBookingEmail') || document.getElementById('bookingEmail');
    if (inEmail) inEmail.focus();
    return;
  }

  if (!pessoas || pessoas < 1) {
    alert('Por favor, informe a quantidade de convidados para prosseguir.');
    const inPessoas = document.getElementById('modalBookingPessoas') || document.getElementById('bookingPessoas');
    if (inPessoas) inPessoas.focus();
    return;
  }

  if (isSalaPrivada && !selectedBookingDate) {
    alert('Por favor, selecione uma data no calendário antes de prosseguir para o pagamento.');
    window.closeBookingDataModal();
    window.goToBookingStep(1);
    return;
  }

  if (!isSalaPrivada && !selectedReservaData) {
    alert('Por favor, selecione a data da reserva antes de prosseguir.');
    window.voltarParaPassoData();
    return;
  }

  // Avança imediatamente para o Passo 8 (Pagar)
  alternarSecaoFluxo('chkSectionPagar', 8);

  const pagarValor = document.getElementById('pagarValorDisplay');
  const pagarMetodo = document.getElementById('pagarMetodoDisplay');
  const pixBox = document.getElementById('pagarPixBox');
  const cartaoBox = document.getElementById('pagarCartaoBox');
  const linkAvisoErro = document.getElementById('pagarCartaoAvisoErro');
  if (linkAvisoErro) linkAvisoErro.style.display = 'none';

  const nomeMetodo = selectedMetodoTarifa === 'pix' ? 'Pix' : selectedMetodoTarifa === 'debito' ? 'Cartão de Débito' : 'Cartão de Crédito';

  let valorCobrado = 0;
  if (isSalaPrivada) {
    const calc = calcularPrecoSalaPrivada(selectedBookingRoom, selectedMetodoTarifa);
    valorCobrado = calc.valorCobrado;
    if (pagarValor) pagarValor.textContent = calc.formatadoCobrado;
    if (pagarMetodo) {
      pagarMetodo.textContent = `Pagamento Integral da Sala via ${nomeMetodo} (Preço fixo total: ${calc.formatadoCobrado})`;
    }
  } else {
    const calculo = calcularValorReserva(pessoas, selectedMetodoTarifa);
    valorCobrado = calculo.valorTotal;
    if (pagarValor) pagarValor.textContent = calculo.formatadoTotal;
    if (pagarMetodo) pagarMetodo.textContent = `Pagamento via ${nomeMetodo} (R$ ${calculo.valorUnitario}/pessoa)`;
  }

  if (selectedMetodoTarifa === 'pix') {
    if (pixBox) pixBox.style.display = 'block';
    if (cartaoBox) cartaoBox.style.display = 'none';
  } else {
    if (pixBox) pixBox.style.display = 'none';
    if (cartaoBox) cartaoBox.style.display = 'block';
  }

  const mesa = isSalaPrivada ? null : getMesaById(selectedMesaId);
  const mesaNome = isSalaPrivada ? selectedBookingRoom : (mesa ? mesa.nomeExibicao : 'Mesa Salão');
  const ambienteNome = isSalaPrivada ? selectedBookingRoom : 'Salão Principal';
  const ambienteId = isSalaPrivada ? 'salas-privadas' : 'salao-principal';
  const dataReserva = isSalaPrivada ? selectedBookingDate.formattedDisplay : selectedReservaData.formattedDisplay;
  const horaDisplay = isSalaPrivada ? (selectedBookingHorario || '19:00') : (selectedCheckoutHorario || selectedReservaHorario || '19:00');

  // Sincroniza dados no resumo fixo da tela de pagamento (Passo 8)
  const rPagarTipo = document.getElementById('resumoPagarTipoLabel');
  const rPagarMesa = document.getElementById('resumoPagarMesaNome');
  const rPagarDataHora = document.getElementById('resumoPagarDataHora');
  const rPagarTitular = document.getElementById('resumoPagarTitularNome');
  const rPagarQtdLabel = document.getElementById('resumoPagarQtdLabel');
  const rPagarQtd = document.getElementById('resumoPagarQtdPessoas');

  if (rPagarTipo) rPagarTipo.textContent = isSalaPrivada ? 'Sala Escolhida:' : 'Mesa Escolhida:';
  if (rPagarMesa) {
    rPagarMesa.textContent = mesaNome;
    rPagarMesa.style.color = isSalaPrivada ? ((ROOM_DATA[selectedBookingRoom] || {}).themeColor || '#00E699') : '#F59E0B';
  }
  if (rPagarDataHora) rPagarDataHora.textContent = `${dataReserva} às ${horaDisplay}`;
  if (rPagarTitular) rPagarTitular.textContent = nome;
  if (rPagarQtdLabel) rPagarQtdLabel.textContent = isSalaPrivada ? 'Quantidade de Convidados:' : 'Quantidade:';
  const maxCap = isSalaPrivada ? ((ROOM_DATA[selectedBookingRoom] || {}).capacidadeNum || 40) : 40;
  if (rPagarQtd) rPagarQtd.textContent = isSalaPrivada ? `${pessoas} convidados (Máx: ${maxCap})` : `${pessoas} pessoa(s)`;

  const codigoReserva = generateReservationCode();
  const qrToken = generateQrCodeToken();
  const qrSvg = generateQrCodeSvg(codigoReserva, 180);

  // Exibe feedback de geração de cobrança
  const inputPix = document.getElementById('chkPixInput');
  const liveStatus = document.getElementById('pagarStatusLiveTexto');
  if (inputPix) inputPix.value = 'Conectando ao gateway Asaas...';
  if (liveStatus) liveStatus.textContent = 'Gerando cobrança oficial no Asaas...';

  // Cria a sessão de pagamento no servidor com validação autoritativa de preços
  pararMonitoramentoPagamento();
  try {
    currentPaymentSession = await createPaymentSession({
      codigoReserva,
      valor: valorCobrado,
      metodo: selectedMetodoTarifa,
      comprador: { nome, email, whatsapp },
      ambiente: ambienteNome,
      tipoReserva: isSalaPrivada ? 'sala' : 'mesa',
      salaNome: isSalaPrivada ? selectedBookingRoom : undefined,
      mesaId: isSalaPrivada ? undefined : selectedMesaId,
      pessoas
    });
  } catch (err) {
    console.warn('Aviso ao gerar sessão Asaas:', err);
    // Permanece na Etapa 8 e exibe aviso claro sem expulsar o cliente de volta à Etapa 6
    if (liveStatus) {
      liveStatus.textContent = `Aviso Gateway: ${err.message || 'Aguardando configuração de chave ou comunicação.'}`;
    }
    if (inputPix && selectedMetodoTarifa === 'pix') {
      inputPix.value = `Indisponível no momento (${err.message || 'Erro Asaas'})`;
    }
    if (linkAvisoErro) {
      linkAvisoErro.textContent = `Aviso do Asaas: ${err.message || 'Falha ao processar pagamento.'}`;
      linkAvisoErro.style.display = 'block';
    }
    currentPaymentSession = null;
  }

  // Registra pré-reserva com status PENDING no Supabase
  currentReservaPendente = {
    codigoReserva,
    nome,
    whatsapp,
    email,
    data: dataReserva,
    horario: isSalaPrivada ? (selectedBookingHorario || '19:00') : (selectedCheckoutHorario || selectedReservaHorario || '19:00'),
    ambienteId,
    salaOuMesa: mesaNome,
    sala: mesaNome,
    pessoas,
    status: 'PENDING',
    statusPagamento: 'aguardando',
    transacaoId: currentPaymentSession?.transacaoId || null,
    qrCodeToken: qrToken,
    valorTotal: valorCobrado,
    valorSinal: null,
    valorPago: 0,
    metodoPagamento: selectedMetodoTarifa,
    gateway: 'asaas',
    origem: isSalaPrivada ? 'agendamento_salas' : 'site_cliente',
    qrSvg
  };

  try {
    if (isSupabaseConfigured) {
      await criarReservaComCompliance(currentReservaPendente);
    }
  } catch (dbErr) {
    console.warn('Aviso pré-reserva Supabase:', dbErr);
  }

  // Injeta dados Pix se disponíveis
  if (currentPaymentSession) {
    if (inputPix && currentPaymentSession.pixCopiaECola) {
      inputPix.value = currentPaymentSession.pixCopiaECola;
    }

    const qrWrap = document.getElementById('pagarPixQrWrap');
    const qrImg = document.getElementById('pagarPixQrImg');
    if (qrWrap && qrImg) {
      if (currentPaymentSession.pixQrCodeBase64) {
        qrImg.src = `data:image/png;base64,${currentPaymentSession.pixQrCodeBase64}`;
        qrWrap.style.display = 'block';
      } else {
        qrWrap.style.display = 'none';
      }
    }

    // Link para checkout Asaas em cartão
    const linkWrap = document.getElementById('pagarCartaoLinkWrap');
    const linkBtn = document.getElementById('pagarCartaoLinkBtn');
    const linkAvisoErro = document.getElementById('pagarCartaoAvisoErro');
    const sandboxAviso = document.getElementById('pagarCartaoSandboxAviso');

    if (linkWrap && linkBtn) {
      const url = currentPaymentSession.checkoutUrl;
      const isUrlValida = url && typeof url === 'string' && url.startsWith('http') &&
        !url.endsWith('/i/') && !url.endsWith('/i') && !url.endsWith('/c/') && !url.endsWith('/c') &&
        !url.includes('/login') && !url.includes('/cadastro');

      if (isUrlValida) {
        linkBtn.href = url;
        linkWrap.style.display = 'block';
        if (linkAvisoErro) linkAvisoErro.style.display = 'none';

        // Mostra aviso informativo sobre autenticação de teste no Sandbox
        if (sandboxAviso) {
          sandboxAviso.style.display = currentPaymentSession.ambienteAsaas === 'sandbox' ? 'block' : 'none';
        }
      } else {
        linkBtn.href = '#';
        linkWrap.style.display = 'none';
        if (sandboxAviso) sandboxAviso.style.display = 'none';
        if (linkAvisoErro) {
          linkAvisoErro.textContent = 'Link oficial de fatura do Asaas não disponível para esta transação.';
          linkAvisoErro.style.display = 'block';
        }
      }

      // Previne navegação acidental caso o link esteja indisponível
      if (!linkBtn._clickGuardAttached) {
        linkBtn._clickGuardAttached = true;
        linkBtn.addEventListener('click', (e) => {
          const currentHref = linkBtn.getAttribute('href') || '';
          if (!currentHref || currentHref === '#' || !currentHref.startsWith('http')) {
            e.preventDefault();
            alert('Aguarde: o link da fatura segura ainda está sendo gerado ou não está disponível.');
          }
        });
      }
    }

    // Inicia monitoramento automático do pagamento junto ao servidor
    iniciarMonitoramentoPagamento(currentPaymentSession.transacaoId, currentReservaPendente);
  }
};

window.copiarPixCodigo = () => {
  const input = document.getElementById('chkPixInput');
  if (input && input.value) {
    navigator.clipboard?.writeText(input.value);
    const btn = document.getElementById('btnCopiarPix');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Chave Copiada! ✓';
      setTimeout(() => { btn.textContent = orig; }, 2200);
    }
  }
};

// Monitoramento automático periódico do pagamento junto ao servidor
function iniciarMonitoramentoPagamento(transacaoId, reservaPendente) {
  pararMonitoramentoPagamento();
  if (!transacaoId) return;

  const liveStatus = document.getElementById('pagarStatusLiveTexto');
  if (liveStatus) {
    liveStatus.textContent = 'Aguardando pagamento no Asaas... (Verificação automática ativa)';
  }

  paymentPollingTimer = setInterval(async () => {
    try {
      const statusCheck = await checkPaymentStatus(transacaoId);
      if (statusCheck && statusCheck.pago) {
        pararMonitoramentoPagamento();
        await finalizarReservaAprovada(reservaPendente, statusCheck);
      }
    } catch (e) {
      // Falha silenciosa no polling contínuo
    }
  }, 5000);
}

// ----------------------------------------------------------------------------
// 9. Verificação manual ou automática do status real do pagamento
// A reserva SÓ é aprovada após confirmação real do Asaas no servidor.
// ----------------------------------------------------------------------------
window.verificarPagamentoManual = async () => {
  const btn = document.getElementById('btnFinalizarPagamento');
  const txt = document.getElementById('btnFinalizarPagamentoTexto');

  if (!currentPaymentSession?.transacaoId) {
    alert('Nenhuma cobrança ativa identificada. Por favor, reinicie a reserva.');
    return;
  }

  if (btn) btn.disabled = true;
  if (txt) txt.textContent = 'Consultando Servidor Asaas... ⏳';

  try {
    const statusCheck = await checkPaymentStatus(currentPaymentSession.transacaoId);

    if (statusCheck && statusCheck.pago) {
      pararMonitoramentoPagamento();
      await finalizarReservaAprovada(currentReservaPendente, statusCheck);
    } else {
      const statusLabel = statusCheck?.status || 'PENDING';
      alert(`O Asaas ainda não identificou a confirmação do pagamento (Status: ${statusLabel}).\n\nSe você já realizou o pagamento no app do seu banco, aguarde alguns instantes pela compensação financeira e clique novamente em verificar.`);
      const liveStatus = document.getElementById('pagarStatusLiveTexto');
      if (liveStatus) {
        liveStatus.textContent = `Aguardando compensação no Asaas... (Status: ${statusLabel})`;
      }
    }
  } catch (err) {
    console.error('Erro na consulta manual do Asaas:', err);
    alert('Falha ao consultar status junto ao servidor. Tente novamente em alguns segundos.');
  } finally {
    if (btn) btn.disabled = false;
    if (txt) txt.textContent = 'Já Paguei, Verificar no Asaas 🔄';
  }
};

// Retrocompatibilidade
window.confirmarPagamentoEFinalizar = window.verificarPagamentoManual;

// Conclusão oficial e emissão do voucher apenas quando comprovado pagamento real
async function finalizarReservaAprovada(reservaPendente, statusCheck) {
  pararMonitoramentoPagamento();

  const reservaData = {
    ...reservaPendente,
    status: 'CONFIRMED',
    statusPagamento: 'aprovado',
    valorPago: statusCheck?.valor || reservaPendente.valorTotal,
    transacaoId: statusCheck?.transacaoId || reservaPendente.transacaoId
  };

  // Atualiza no Supabase para CONFIRMED e aprovado
  try {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('reservas').update({
        status: 'CONFIRMED',
        status_pagamento: 'aprovado',
        valor_pago: reservaData.valorPago,
        transacao_id: reservaData.transacaoId,
        atualizado_em: new Date().toISOString()
      }).eq('codigo_reserva', reservaPendente.codigoReserva);
    }
  } catch (err) {
    console.warn('Aviso Supabase atualização aprovada:', err);
  }

  // Atualiza no Firestore
  try {
    await salvarAgendamento({
      ...reservaData,
      dataIso: selectedReservaData ? selectedReservaData.dateStr : (selectedBookingDate ? selectedBookingDate.dateStr : '')
    });
  } catch (fireErr) {
    console.warn('Fallback Firestore agendamento:', fireErr);
  }

  // Se for mesa, marca no mapa
  const isSalaPrivada = Boolean(selectedBookingRoom);
  if (!isSalaPrivada) {
    reservasOcupadas.push(reservaData);
    atualizarStatusMesasNoMapa();
  }

  activeConfirmedReservation = reservaData;

  // 9. Mostra a confirmação da reserva (Passo 9)
  alternarSecaoFluxo('chkSectionConfirmacao', 9);

  const codeEl = document.getElementById('voucherReservationCode');
  const qrContainer = document.getElementById('qrCodeContainer');
  const emailEl = document.getElementById('voucherSentEmail');
  const briefEl = document.getElementById('voucherDetailsBrief');

  if (codeEl) codeEl.textContent = reservaData.codigoReserva;
  if (qrContainer) qrContainer.innerHTML = reservaData.qrSvg;
  if (emailEl) emailEl.textContent = reservaData.email;
  if (briefEl) {
    const valorFmt = `R$ ${Number(reservaData.valorPago || reservaData.valorTotal).toFixed(2).replace('.', ',')}`;
    const infoCapacidade = isSalaPrivada ? `Locação Exclusiva da Sala Completa (${reservaData.pessoas} convidados)` : `👥 ${reservaData.pessoas} pessoa(s)`;
    briefEl.innerHTML = `
      <strong>${reservaData.nome}</strong> • <strong>${reservaData.salaOuMesa}</strong><br>
      📅 ${reservaData.data} às ${reservaData.horario} • ${infoCapacidade}<br>
      <span style="color: #10B981; font-weight: 700;">✓ Pago: ${valorFmt} (${reservaData.metodoPagamento.toUpperCase()})</span>
    `;
  }
}


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

// Função utilitária para renderização de markdown dos documentos jurídicos
function renderLegalMarkdown(text) {
  if (!text) return '';
  return text
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('# ')) {
        return `<h1 style="color: #FFFFFF; font-size: 1.35rem; margin: 0 0 12px; font-weight: 800;">${trimmed.substring(2)}</h1>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h2 style="color: #FFFFFF; font-size: 1.15rem; margin: 18px 0 8px; font-weight: 700;">${trimmed.substring(3)}</h2>`;
      }
      if (trimmed.startsWith('### ')) {
        return `<h3 style="color: #00F0FF; font-size: 1.05rem; margin: 20px 0 8px; font-weight: 700; border-left: 3px solid #00F0FF; padding-left: 10px;">${trimmed.substring(4)}</h3>`;
      }
      if (trimmed.startsWith('#### ')) {
        return `<h4 style="color: #FFFFFF; font-size: 0.95rem; margin: 14px 0 6px; font-weight: 600;">${trimmed.substring(5)}</h4>`;
      }
      if (trimmed.startsWith('---')) {
        return `<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 16px 0;">`;
      }
      // Listas de marcadores (linhas iniciando com - ou *)
      const lines = trimmed.split('\n');
      if (lines.length > 1 && lines.every(line => line.trim().startsWith('- ') || line.trim().startsWith('* '))) {
        const items = lines.map(line => {
          const itemText = line.trim().replace(/^[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return `<li style="margin-bottom: 6px;">${itemText}</li>`;
        }).join('');
        return `<ul style="padding-left: 20px; margin: 8px 0 12px; color: #CBD5E1;">${items}</ul>`;
      }
      // Caixa de aviso/destaque
      if (trimmed.startsWith('> ')) {
        const alertText = trimmed.replace(/^>\s*/gm, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return `<div class="termos-alert-box" style="margin: 12px 0;">${alertText}</div>`;
      }
      const formatted = trimmed
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      return `<p style="margin-bottom: 10px; line-height: 1.6; color: #CBD5E1;">${formatted}</p>`;
    })
    .join('');
}

// Visualizadores de Documentos Jurídicos Completos
window.openTermosCompletosModal = (e) => {
  if (e && e.preventDefault) e.preventDefault();
  const body = document.getElementById('modalTermosCompletosBody');
  if (body) {
    body.innerHTML = renderLegalMarkdown(TERMOS_COMPRA_RESERVA);
  }
  const modal = document.getElementById('modalTermosCompletos');
  if (modal) modal.style.display = 'flex';
};

window.openPoliticaPrivacidadeModal = (e) => {
  if (e && e.preventDefault) e.preventDefault();
  const body = document.getElementById('modalPoliticaPrivacidadeBody');
  if (body) {
    body.innerHTML = renderLegalMarkdown(POLITICA_PRIVACIDADE);
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

  const nome = document.getElementById('bookingNome')?.value?.trim();
  const whatsapp = document.getElementById('bookingWhatsapp')?.value?.trim();
  const email = document.getElementById('bookingEmail')?.value?.trim();
  const pessoas = parseInt(document.getElementById('bookingPessoas')?.value || '1', 10);
  const chkTermos = document.getElementById('bookingTermosCheck');
  const horario = document.getElementById('bookingHorario')?.value || selectedBookingHorario || '19:00';
  selectedBookingHorario = horario;
  if (typeof window !== 'undefined') window.selectedBookingHorario = horario;

  if (!selectedBookingDate) {
    alert('Por favor, selecione primeiro uma data no calendário para a sua reserva!');
    window.goToBookingStep(1);
    return;
  }

  if (!nome) return alert('Por favor, informe seu nome completo.');
  const cleanZap = (whatsapp || '').replace(/\D/g, '');
  if (!cleanZap || cleanZap.length < 10) return alert('Por favor, informe seu WhatsApp com DDD (10 ou 11 dígitos).');
  if (!email || !email.includes('@') || !email.includes('.')) return alert('Por favor, informe um e-mail válido para envio da fatura ou voucher.');
  if (!pessoas || pessoas < 1) return alert('Por favor, informe a quantidade de convidados.');
  if (chkTermos && !chkTermos.checked) return alert('É necessário concordar com os termos de responsabilidade para prosseguir.');

  const chkCancel = document.getElementById('bookingCancelamentoCheck');
  if (chkCancel && !chkCancel.checked) {
    alert('É obrigatório dar o aceite explícito na Política de Cancelamento (ciência de que 50% do valor corresponde à parcela que poderá não ser reembolsada) para prosseguir.');
    return;
  }

  // Garante que a sala selecionada está configurada
  if (!selectedBookingRoom && pendingRoomSelection) {
    selectedBookingRoom = pendingRoomSelection;
  }
  if (!selectedBookingRoom) {
    selectedBookingRoom = 'Sala Red';
  }
  if (typeof window !== 'undefined') window.selectedBookingRoom = selectedBookingRoom;

  // Salva no storage para reutilização/autofill
  try {
    localStorage.setItem('bk_cliente_nome', nome);
    localStorage.setItem('bk_cliente_zap', whatsapp);
    localStorage.setItem('bk_cliente_email', email);
  } catch (err) {}

  // Sincroniza com os campos do modal de pagamento Asaas
  const mNome = document.getElementById('modalBookingNome');
  const mZap = document.getElementById('modalBookingWhatsapp');
  const mEmail = document.getElementById('modalBookingEmail');
  const mPessoas = document.getElementById('modalBookingPessoas');
  if (mNome) mNome.value = nome;
  if (mZap) mZap.value = whatsapp;
  if (mEmail) mEmail.value = email;
  if (mPessoas) mPessoas.value = pessoas;

  // Sincroniza aceite da política de cancelamento e termos no modal
  const chkModalCancel = document.getElementById('chkPoliticaCancelamentoAceita');
  if (chkModalCancel) chkModalCancel.checked = true;
  const chkModalTermos = document.getElementById('chkReservaTermosAceitos');
  if (chkModalTermos) chkModalTermos.checked = true;

  // Abre modal no Passo 6 (Resumo & Forma de Pagamento)
  const modal = document.getElementById('bookingDataModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    window.mostrarResumoEPagamento();
  }
};

// Integração Oficial do Mapa do Salão com o Checkout de Mesas
window.iniciarPagamentoReservaMesa = async ({
  mesaId,
  mesaNome,
  data,
  horario,
  pessoas,
  nome,
  whatsapp,
  email,
  metodo = 'pix',
  diretoParaPagar = true
}) => {
  selectedBookingRoom = null;
  pendingRoomSelection = null;
  selectedMesaId = mesaId || 'mesa-1';
  selectedCheckoutHorario = horario || '19:00';
  selectedReservaHorario = horario || '19:00';
  selectedMetodoTarifa = (metodo || 'pix').toLowerCase();

  if (data) {
    const parts = data.split('-');
    const dtObj = parts.length === 3 ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)) : new Date();
    selectedReservaData = {
      date: dtObj,
      dateStr: data,
      isoDate: data,
      formattedDisplay: dtObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
  } else if (!selectedReservaData) {
    const dtObj = new Date();
    selectedReservaData = {
      date: dtObj,
      dateStr: dtObj.toISOString().split('T')[0],
      isoDate: dtObj.toISOString().split('T')[0],
      formattedDisplay: dtObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
  }

  const mNome = document.getElementById('modalBookingNome');
  const mZap = document.getElementById('modalBookingWhatsapp');
  const mEmail = document.getElementById('modalBookingEmail');
  const mPessoas = document.getElementById('modalBookingPessoas');

  if (mNome) mNome.value = nome || '';
  if (mZap) mZap.value = whatsapp || '';
  if (mEmail) mEmail.value = email || '';
  if (mPessoas) mPessoas.value = pessoas || 4;

  const chkTermos = document.getElementById('chkReservaTermosAceitos');
  if (chkTermos) chkTermos.checked = true;

  const modal = document.getElementById('bookingDataModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Rola o diálogo para o topo
    const dlg = document.getElementById('bookingDataDialog');
    if (dlg) dlg.scrollTop = 0;

    // Sincroniza e prepara o resumo e forma de pagamento
    window.mostrarResumoEPagamento();

    if (diretoParaPagar) {
      // Avança diretamente para a tela de pagamento (Passo 8 / Asaas)
      try {
        await window.avancarParaPassoPagar();
      } catch (err) {
        console.warn('Transição para tela de pagamento:', err);
      }
    }
  }
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

// ============================================================================
// 10.1 SINCRONIZAÇÃO DAS PROMOÇÕES & DESTAQUES DA HOME
// ============================================================================
export function syncPromocoesCards() {
  const container = document.getElementById('promoCardsContainer');
  if (!container) return;

  // 1. Tenta carregar do localStorage imediatamente (sem delay de rede)
  let cards = null;
  try {
    const raw = localStorage.getItem('backstage_promocoes');
    if (raw) {
      cards = JSON.parse(raw);
    }
  } catch(e) {}

  if (cards && Array.isArray(cards) && cards.length >= 3) {
    applyPromocoesCards(cards);
  }

  // 2. Consulta Firestore de forma assíncrona para atualizações remotas
  if (db) {
    getDoc(doc(db, 'configuracoes', 'promocoes'))
      .then(snap => {
        if (snap.exists() && snap.data()?.cards) {
          const remoteCards = snap.data().cards;
          localStorage.setItem('backstage_promocoes', JSON.stringify(remoteCards));
          applyPromocoesCards(remoteCards);
        } else {
          // Fallback em configuracoes/geral
          getDoc(doc(db, 'configuracoes', 'geral'))
            .then(gSnap => {
              if (gSnap.exists() && gSnap.data()?.promocoes) {
                const remoteCards = gSnap.data().promocoes;
                localStorage.setItem('backstage_promocoes', JSON.stringify(remoteCards));
                applyPromocoesCards(remoteCards);
              }
            })
            .catch(() => {});
        }
      })
      .catch(err => {
        console.warn('Sync promocoes Firestore:', err);
      });
  }
}

function applyPromocoesCards(cards) {
  const cardElements = [
    document.getElementById('promoCard1'),
    document.getElementById('promoCard2'),
    document.getElementById('promoCard3')
  ];

  cards.forEach((cardData, idx) => {
    const el = cardElements[idx];
    if (!el || !cardData) return;

    const imgEl = el.querySelector('img');
    if (imgEl && cardData.imagemUrl) {
      imgEl.src = cardData.imagemUrl;
      imgEl.alt = cardData.titulo || cardData.label || 'Destaque Backstage Karaokê';
    }

    // Gerencia a legenda (caption)
    const oldCaption = el.querySelector('.gallery-caption');
    const hasText = Boolean(
      (cardData.titulo && cardData.titulo.trim()) ||
      (cardData.descricao && cardData.descricao.trim())
    );

    if (hasText) {
      const tagHtml = cardData.tag && cardData.tag.trim() ? `<span class="caption-tag">${cardData.tag.trim()}</span>` : '';
      const titleHtml = cardData.titulo && cardData.titulo.trim() ? `<span class="caption-title">${cardData.titulo.trim()}</span>` : '';
      const descHtml = cardData.descricao && cardData.descricao.trim() ? `<p class="promo-desc">${cardData.descricao.trim()}</p>` : '';

      if (oldCaption) {
        oldCaption.innerHTML = `${tagHtml}${titleHtml}${descHtml}`;
        oldCaption.style.display = 'flex';
      } else {
        const caption = document.createElement('div');
        caption.className = 'gallery-caption promo-caption';
        caption.innerHTML = `${tagHtml}${titleHtml}${descHtml}`;
        el.appendChild(caption);
      }
    } else {
      // Se não houver título nem descrição, remove a legenda para a foto ficar 100% limpa!
      if (oldCaption) {
        oldCaption.remove();
      }
    }
  });
}

/**
 * Aplica configurações gerais ao DOM do site público em tempo real
 */
export function applyConfiguracoesToDOM(conf) {
  if (!conf || typeof conf !== 'object') return;

  // 1. WhatsApp Oficial
  if (conf.whatsapp) {
    const cleanPhone = String(conf.whatsapp).replace(/\D/g, '');
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

  // 2. E-mail de Contato Oficial (Atualiza em tempo real)
  if (conf.contatoEmail) {
    const emailVal = conf.contatoEmail.trim();
    const mailLink = document.getElementById('footerContactEmail');
    const mailText = document.getElementById('footerContactEmailText');
    if (mailLink) mailLink.href = `mailto:${emailVal}`;
    if (mailText) mailText.textContent = emailVal;

    document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
      link.href = `mailto:${emailVal}`;
    });
  }

  // 3. Instagram
  if (conf.instagram) {
    const rawInsta = conf.instagram.trim();
    const cleanInsta = rawInsta.replace('@', '');
    const instaLink = document.getElementById('footerInstagramLink');
    const instaText = document.getElementById('footerInstagramText');
    if (instaLink) instaLink.href = `https://www.instagram.com/${cleanInsta}`;
    if (instaText) instaText.textContent = `@${cleanInsta}`;

    document.querySelectorAll('a[href*="instagram.com"]').forEach(link => {
      link.href = `https://www.instagram.com/${cleanInsta}`;
    });
  }

  // 4. Endereço
  if (conf.endereco) {
    const enderecoEl = document.getElementById('footerEndereco');
    if (enderecoEl) {
      enderecoEl.textContent = `${conf.endereco} • Proibido menores de 18 no Salão Principal`;
    }
  }

  // 5. Link Google Maps
  if (conf.mapsUrl) {
    document.querySelectorAll('a[href*="maps.app.goo.gl"], a[href*="google.com/maps"]').forEach(link => {
      link.href = conf.mapsUrl;
    });
  }

  // 6. PDF do Cardápio
  if (conf.pdfUrl) {
    document.querySelectorAll('a[href*="cardapio-oficial.pdf"], #verCardapioPdfMainBtn').forEach(link => {
      link.href = conf.pdfUrl;
    });
  }
}

/**
 * Aplica dados atualizados das salas ao DOM e ao estado global de reservas
 */
export function applySalasToDOM(salas) {
  if (!salas || !Array.isArray(salas) || salas.length === 0) return;

  salas.forEach(s => {
    const preco = Number(s.precoTotal || 800);
    const precoFmt = `R$ ${preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const cap = s.capacidade || 30;

    // Atualiza estado global dinâmico ROOM_DATA
    if (ROOM_DATA[s.nome]) {
      ROOM_DATA[s.nome].precoTotal = precoFmt;
      ROOM_DATA[s.nome].precoTotalNum = preco;
      ROOM_DATA[s.nome].capacidade = `Até ${cap} pessoas`;
      ROOM_DATA[s.nome].capacidadeNum = cap;
      if (s.descricao) ROOM_DATA[s.nome].descricao = s.descricao;
      if (typeof s.ativo !== 'undefined') ROOM_DATA[s.nome].ativo = s.ativo;
    }

    // Busca os cards no DOM por data-room ou classes de tema
    const themeClass = s.nome === 'Sala Red' ? '.room-theme-red' : (s.nome === 'Sala Green' ? '.room-theme-green' : '.room-theme-blue');
    const cards = document.querySelectorAll(
      `.step-room-card[data-room="${s.nome}"], .room-pick-card[data-room="${s.nome}"], .step-room-card${themeClass}`
    );

    cards.forEach(card => {
      card.setAttribute('data-capacity', cap);
      card.setAttribute('data-price', preco);
      card.setAttribute('data-signal', preco);

      const capPill = card.querySelector('.room-card-capacity-pill, .room-cap-badge');
      if (capPill) capPill.textContent = `Até ${cap} pessoas`;

      const priceEl = card.querySelector('.room-card-total-price, .total-val');
      if (priceEl) priceEl.textContent = precoFmt;

      const descEl = card.querySelector('.room-card-desc, .room-pick-desc');
      if (descEl && s.descricao) descEl.textContent = s.descricao;

      if (s.ativo === false) {
        card.style.opacity = '0.45';
        card.style.pointerEvents = 'none';
      } else {
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
      }
    });

    // Se o modal de resumo ou personalidades estiver aberto para esta sala, atualiza em tempo real
    if (selectedBookingRoom === s.nome) {
      const summaryCap = document.getElementById('summaryCapVal');
      const summaryTotal = document.getElementById('summaryTotalVal');
      if (summaryCap) summaryCap.textContent = `Até ${cap} pessoas`;
      if (summaryTotal) summaryTotal.textContent = precoFmt;
    }
  });
}

/**
 * Aplica itens do cardápio oficial ao DOM de cardapio.html em tempo real
 */
export function applyCardapioToDOM(items) {
  if (!items || !Array.isArray(items) || items.length === 0) return;
  if (!document.querySelector('.cardapio-page-view') && !document.getElementById('cardapio')) return;

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

/**
 * Aplica bloqueios de calendário ao sistema de disponibilidade
 */
export function applyBloqueiosToDOM(bloqueios) {
  if (!bloqueios || !Array.isArray(bloqueios)) return;
  activeBlockedDates = bloqueios;
  try {
    renderCalendar();
  } catch(e) {}
}

/**
 * Sincroniza dados oficiais (LocalStorage -> Supabase -> Firestore) para o site público
 */
async function loadPublicDataFromFirestore() {
  // 1. Carregamento imediato a partir do localStorage (resposta zero latency)
  try {
    const localConf = localStorage.getItem('backstage_configuracoes');
    if (localConf) applyConfiguracoesToDOM(JSON.parse(localConf));

    const localSalas = localStorage.getItem('backstage_salas');
    if (localSalas) applySalasToDOM(JSON.parse(localSalas));

    const localCardapio = localStorage.getItem('backstage_cardapio');
    if (localCardapio) applyCardapioToDOM(JSON.parse(localCardapio));

    const localBloqueios = localStorage.getItem('backstage_bloqueios');
    if (localBloqueios) applyBloqueiosToDOM(JSON.parse(localBloqueios));
  } catch(e) {}

  if (!db && !isSupabaseConfigured) return;

  try {
    // 2. Configurações Gerais
    try {
      let conf = null;
      if (isSupabaseConfigured) {
        try { conf = await getConfiguracoesSupabase(); } catch (e) {}
      }
      if (!conf && db) {
        const confSnap = await getDoc(doc(db, 'configuracoes', 'geral'));
        if (confSnap.exists()) conf = confSnap.data();
      }
      if (conf) applyConfiguracoesToDOM(conf);
    } catch(e) {}

    // 3. Bloqueios de Calendário
    try {
      let bloqueios = [];
      if (isSupabaseConfigured) {
        try { bloqueios = await getBloqueiosSupabase(); } catch (e) {}
      }
      if ((!bloqueios || bloqueios.length === 0) && db) {
        const bSnap = await getDocs(collection(db, 'bloqueios'));
        if (!bSnap.empty) bloqueios = bSnap.docs.map(d => d.data());
      }
      if (bloqueios && bloqueios.length > 0) applyBloqueiosToDOM(bloqueios);
    } catch(e) {}

    // 4. Salas
    try {
      let salas = [];
      if (isSupabaseConfigured) {
        try { salas = await getSalasSupabase(); } catch (e) {}
      }
      if ((!salas || salas.length === 0) && db) {
        const sSnap = await getDocs(collection(db, 'salas'));
        if (!sSnap.empty) salas = sSnap.docs.map(d => d.data());
      }
      if (salas && salas.length > 0) applySalasToDOM(salas);
    } catch(e) {}

    // 5. Cardápio Oficial
    if (document.querySelector('.cardapio-page-view') || document.getElementById('cardapio')) {
      try {
        let items = [];
        if (isSupabaseConfigured) {
          try { items = await getCardapioSupabase(); } catch(e) {}
        }
        if ((!items || items.length === 0) && db) {
          const cSnap = await getDocs(collection(db, 'cardapio'));
          if (!cSnap.empty) items = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        if (items && items.length > 0) applyCardapioToDOM(items);
      } catch(e) {}
    }
  } catch(err) {
    console.warn('Sync público geral:', err);
  }
}

/**
 * Inicializa ouvintes de tempo real no site:
 * 1. BroadcastChannel (0ms entre abas do mesmo navegador)
 * 2. Eventos de Storage (multi-aba)
 * 3. Firestore onSnapshot (tempo real de nuvem para todos os visitantes)
 * 4. Supabase Realtime Channels (se configurado)
 */
export function initRealtimeListeners() {
  // 1. BroadcastChannel para comunicação instantânea entre abas
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('backstage_realtime');
      bc.onmessage = (event) => {
        const { type, data } = event.data || {};
        if (type === 'CONFIGURACOES_UPDATE') applyConfiguracoesToDOM(data);
        else if (type === 'SALAS_UPDATE') applySalasToDOM(data);
        else if (type === 'PROMOCOES_UPDATE') applyPromocoesCards(data);
        else if (type === 'CARDAPIO_UPDATE') applyCardapioToDOM(data);
        else if (type === 'BLOQUEIOS_UPDATE') applyBloqueiosToDOM(data);
      };
    }
  } catch(e) {}

  // 2. Storage Event (fallback multi-aba)
  try {
    window.addEventListener('storage', (e) => {
      if (!e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (e.key === 'backstage_configuracoes') applyConfiguracoesToDOM(parsed);
        else if (e.key === 'backstage_promocoes') applyPromocoesCards(parsed);
        else if (e.key === 'backstage_salas') applySalasToDOM(parsed);
        else if (e.key === 'backstage_cardapio') applyCardapioToDOM(parsed);
        else if (e.key === 'backstage_bloqueios') applyBloqueiosToDOM(parsed);
      } catch(err) {}
    });
  } catch(e) {}

  // 3. Firestore onSnapshot em tempo real
  if (db) {
    try {
      // Configurações Gerais
      onSnapshot(doc(db, 'configuracoes', 'geral'), (snap) => {
        if (snap.exists()) applyConfiguracoesToDOM(snap.data());
      }, (err) => console.warn('Realtime configuracoes aviso:', err));

      // Promoções
      onSnapshot(doc(db, 'configuracoes', 'promocoes'), (snap) => {
        if (snap.exists() && snap.data()?.cards) applyPromocoesCards(snap.data().cards);
      }, (err) => console.warn('Realtime promocoes aviso:', err));

      // Salas
      onSnapshot(collection(db, 'salas'), (snap) => {
        if (!snap.empty) applySalasToDOM(snap.docs.map(d => d.data()));
      }, (err) => console.warn('Realtime salas aviso:', err));

      // Bloqueios
      onSnapshot(collection(db, 'bloqueios'), (snap) => {
        if (!snap.empty) applyBloqueiosToDOM(snap.docs.map(d => d.data()));
      }, (err) => console.warn('Realtime bloqueios aviso:', err));

      // Cardápio (se estiver na página de cardápio)
      if (document.querySelector('.cardapio-page-view') || document.getElementById('cardapio')) {
        onSnapshot(collection(db, 'cardapio'), (snap) => {
          if (!snap.empty) applyCardapioToDOM(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.warn('Realtime cardapio aviso:', err));
      }
    } catch(fsErr) {
      console.warn('Realtime Firestore subscription aviso:', fsErr);
    }
  }

  // 4. Supabase Realtime Channels (se configurado)
  if (isSupabaseConfigured && supabase) {
    try {
      supabase.channel('backstage_public_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, async () => {
          const c = await getConfiguracoesSupabase();
          if (c) applyConfiguracoesToDOM(c);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, async () => {
          const s = await getSalasSupabase();
          if (s) applySalasToDOM(s);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cardapio' }, async () => {
          const items = await getCardapioSupabase();
          if (items) applyCardapioToDOM(items);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bloqueios' }, async () => {
          const b = await getBloqueiosSupabase();
          if (b) applyBloqueiosToDOM(b);
        })
        .subscribe();
    } catch(supaErr) {
      console.warn('Realtime Supabase subscription aviso:', supaErr);
    }
  }
}

// Inicialização imediata ao final do script garantindo que todo o escopo está carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
