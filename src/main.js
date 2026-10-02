/**
 * Backstage Karaokê - Interactive Application Script
 */

import { salvarAgendamento } from './lib/firebase.js';

function bootstrap() {
  initWelcomeScreen();
  initHeader();
  initMobileMenu();
  initSplitCalculator();
  initMenuTabs();
  initLightbox();
  initSmoothScroll();
  initSectionTracking();
  initBookingSystem();
  handleInitialHashNavigation();
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
    if (window.location.hash === '#welcome' || sessionStorage.getItem('backstage_show_welcome') === 'true') {
      sessionStorage.removeItem('backstage_entered');
      sessionStorage.removeItem('backstage_show_welcome');
      welcomeScreen.style.display = 'flex';
      welcomeScreen.classList.remove('fade-out');
      window.scrollTo(0, 0);
    } else if (sessionStorage.getItem('backstage_entered') === 'true') {
      welcomeScreen.style.display = 'none';
      return;
    }
  } catch(e) {}

  const hash = window.location.hash;
  if (hash && hash !== '#welcome' && hash !== '#inicio') {
    welcomeScreen.style.display = 'none';
    return;
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
    dismiss(targetId);
  };

  const enterBtn = document.getElementById('enterSiteBtn');
  if (enterBtn) {
    enterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      dismiss('agendamento');
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

// 9. Interactive Booking System (Calendário e Agendamento das Salas)
let selectedBookingDate = null;
let selectedBookingRoom = null;
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

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

  // Format WhatsApp input
  const phoneInput = document.getElementById('bookingWhatsapp');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
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
  }

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Blank filler cells for alignment
  for (let i = 0; i < firstDayIndex; i++) {
    const blank = document.createElement('div');
    blank.className = 'calendar-day-cell blank';
    daysGrid.appendChild(blank);
  }

  // Day buttons
  for (let d = 1; d <= totalDays; d++) {
    const cellDate = new Date(currentCalYear, currentCalMonth, d);
    cellDate.setHours(0, 0, 0, 0);
    const dayOfWeek = cellDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const isPast = cellDate < today;
    const isClosed = (dayOfWeek === 0 || dayOfWeek === 1); // Sunday and Monday
    const isPromo = (dayOfWeek >= 2 && dayOfWeek <= 4); // Tuesday to Thursday: Promo R$ 200 consumação

    const dayBtn = document.createElement('button');
    dayBtn.type = 'button';
    dayBtn.className = 'calendar-day-btn';
    dayBtn.textContent = d;

    const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const formattedDisplay = `${WEEKDAY_NAMES[dayOfWeek]}, ${String(d).padStart(2, '0')}/${String(currentCalMonth + 1).padStart(2, '0')}/${currentCalYear}`;

    if (isPast) {
      dayBtn.classList.add('disabled', 'past');
      dayBtn.disabled = true;
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

        const displayEl = document.getElementById('selectedDateDisplay');
        if (displayEl) {
          displayEl.textContent = `(${formattedDisplay})`;
          displayEl.style.color = '#00F0FF';
        }

        const summaryDate = document.getElementById('summaryDateVal');
        if (summaryDate) {
          summaryDate.textContent = formattedDisplay;
        }
      });
    }

    daysGrid.appendChild(dayBtn);
  }
}

// Global Room Selection Handler - Revela os dados apenas após escolher a sala
window.selectBookingRoom = (element) => {
  document.querySelectorAll('.room-pick-card').forEach(c => c.classList.remove('active'));
  element.classList.add('active');

  const roomName = element.getAttribute('data-room');
  selectedBookingRoom = roomName;

  const summaryRoom = document.getElementById('summaryRoomName');
  if (summaryRoom) {
    summaryRoom.textContent = roomName;
    if (roomName === 'Sala Red') {
      summaryRoom.style.color = 'var(--room-red)';
    } else if (roomName === 'Sala Green') {
      summaryRoom.style.color = 'var(--room-green)';
    } else if (roomName === 'Sala Blue') {
      summaryRoom.style.color = 'var(--room-blue)';
    }
  }

  // Revela o Passo 3 (Dados do Agendamento) com transição suave
  const dataStep = document.getElementById('bookingDataStep');
  if (dataStep) {
    dataStep.style.display = 'block';
    setTimeout(() => {
      dataStep.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  }
};

// Global Form Submit Handler
window.handleBookingSubmit = async (e) => {
  if (e && e.preventDefault) e.preventDefault();

  const feedback = document.getElementById('bookingStatusAlert');
  const nome = document.getElementById('bookingNome')?.value?.trim();
  const whatsapp = document.getElementById('bookingWhatsapp')?.value?.trim();
  const pessoas = document.getElementById('bookingPessoas')?.value?.trim();
  const termosCheck = document.getElementById('bookingTermosCheck')?.checked;

  if (!selectedBookingDate) {
    alert('Por favor, selecione uma data disponível no calendário acima!');
    const calEl = document.getElementById('bookingCalendar');
    if (calEl) calEl.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (!selectedBookingRoom) {
    alert('Por favor, escolha uma sala privada antes de prosseguir com os dados!');
    const roomsEl = document.getElementById('roomsSelector');
    if (roomsEl) roomsEl.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (!nome || !whatsapp || !pessoas) {
    alert('Por favor, preencha todos os campos obrigatórios!');
    return;
  }

  if (!termosCheck) {
    alert('É necessário ler e concordar com os Termos de Responsabilidade para prosseguir com o agendamento.');
    return;
  }

  if (feedback) {
    feedback.style.display = 'block';
    feedback.className = 'booking-status-alert info';
    feedback.textContent = 'Registrando agendamento com segurança e abrindo o WhatsApp...';
  }

  // 1. Salvar no Firebase Firestore (preparando para o futuro painel de administração)
  try {
    await salvarAgendamento({
      nome,
      whatsapp,
      data: selectedBookingDate.formattedDisplay,
      sala: selectedBookingRoom,
      pessoas: parseInt(pessoas, 10),
      termosAceitos: true
    });
  } catch (err) {
    console.warn('Erro silencioso ao salvar no Firestore:', err);
  }

  // 2. Montar mensagem formatada para o WhatsApp oficial com declaração explícita dos termos
  const msg = [
    `Olá! Gostaria de agendar uma sala no Backstage Karaokê:`,
    ``,
    `👤 *Nome:* ${nome}`,
    `📱 *WhatsApp:* ${whatsapp}`,
    `📅 *Data:* ${selectedBookingDate.formattedDisplay}`,
    `🎤 *Sala:* ${selectedBookingRoom}`,
    `👥 *Convidados:* ${pessoas} pessoas`,
    ``,
    `📋 *Declaração de Responsabilidade:*`,
    `Li e concordo com os termos de responsabilidade (estou ciente de que o valor de 50% pago para a reserva não é devolvido em caso de desistência).`
  ].join('\n');

  const wppUrl = createWhatsAppUrl(msg);

  if (feedback) {
    feedback.className = 'booking-status-alert success';
    feedback.textContent = '✓ Agendamento pronto! Abrindo o WhatsApp oficial...';
  }

  setTimeout(() => {
    window.open(wppUrl, '_blank');
  }, 400);
};

// Global Termos Modal Trigger
window.openTermosModal = (e) => {
  if (e && e.preventDefault) e.preventDefault();
  const modal = document.getElementById('termosResponsabilidadeModal');
  if (modal) {
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));
  }
};

window.closeTermosModal = (e) => {
  if (e && e.preventDefault) e.preventDefault();
  const modal = document.getElementById('termosResponsabilidadeModal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 280);
  }
};
