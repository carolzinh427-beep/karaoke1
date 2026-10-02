/**
 * Backstage Karaokê - Interactive Application Script
 */

import { salvarAgendamento, db } from './lib/firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

let activeBlockedDates = [];
let WHATSAPP_PHONE = '556181426321';

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
  try { handleInitialHashNavigation(); } catch(e) { console.warn('handleInitialHashNavigation error:', e); }
  try { initSalasGallery(); } catch(e) { console.warn('initSalasGallery error:', e); }
  try { loadPublicDataFromFirestore(); } catch(e) { console.warn('loadPublicDataFromFirestore error:', e); }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
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
      dismiss('inicio'); // Direciona ao Hero do site (#inicio)
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

    const isBlocked = activeBlockedDates.some(b => b.data === dateStr && (b.tipo === 'dia_inteiro' || b.sala === 'todas'));

    if (isPast) {
      dayBtn.classList.add('disabled', 'past');
      dayBtn.disabled = true;
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

    renderMediaParaSala(container1, 'sala-red', items, 'Sala 1 (Sala Red)', 'var(--room-red)');
    renderMediaParaSala(container2, 'sala-green', items, 'Sala 2 (Sala Green)', 'var(--room-green)');
    renderMediaParaSala(container3, 'sala-blue', items, 'Sala 3 (Sala Blue)', 'var(--room-blue)');
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
 * Sincroniza dados oficiais do Firestore para o site público em tempo real
 */
async function loadPublicDataFromFirestore() {
  if (!db) return;

  try {
    // 1. Configurações Gerais (WhatsApp Oficial e PDF do Cardápio)
    try {
      const confSnap = await getDoc(doc(db, 'configuracoes', 'geral'));
      if (confSnap.exists()) {
        const conf = confSnap.data();
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
      const bSnap = await getDocs(collection(db, 'bloqueios'));
      if (!bSnap.empty) {
        activeBlockedDates = bSnap.docs.map(d => d.data());
        renderCalendar();
      }
    } catch(e) {
      console.warn('Sync bloqueios público:', e);
    }

    // 3. Salas (Valores, Capacidades e Descrições)
    try {
      const sSnap = await getDocs(collection(db, 'salas'));
      if (!sSnap.empty) {
        sSnap.docs.forEach(docSnap => {
          const s = docSnap.data();
          const card = document.querySelector(`.room-pick-card[data-room="${s.nome}"]`);
          if (card) {
            if (s.capacidade) {
              card.setAttribute('data-capacity', s.capacidade);
              const capBadge = card.querySelector('.room-cap-badge');
              if (capBadge) capBadge.textContent = `Até ${s.capacidade} pessoas`;
            }
            if (s.precoTotal) {
              card.setAttribute('data-price', s.precoTotal);
              card.setAttribute('data-signal', s.precoTotal / 2);
              const totalVal = card.querySelector('.total-val');
              if (totalVal) totalVal.textContent = `R$ ${s.precoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
              const signalVal = card.querySelector('.signal-val');
              if (signalVal) signalVal.textContent = `Sinal 50%: R$ ${(s.precoTotal / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • No dia: R$ ${(s.precoTotal / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
        const cSnap = await getDocs(collection(db, 'cardapio'));
        if (!cSnap.empty) {
          const items = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
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
                  if (priceEl) priceEl.textContent = `R$ ${it.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
                  <div class="item-price">R$ ${(it.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
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
