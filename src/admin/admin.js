/**
 * BACKSTAGE KARAOKÊ - PAINEL ADMINISTRATIVO COMPLETO
 * Arquitetura SPA moderna integrada com Firebase Auth, Firestore e Firebase Storage.
 */

import { auth, db, storage } from '../lib/firebase.js';
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

// ============================================================================
// 1. ESTADO GLOBAL E ROTEAMENTO
// ============================================================================
const state = {
  user: null,
  currentRoute: '/admin',
  reservas: [],
  bloqueios: [],
  salas: [],
  cardapio: [],
  categorias: [],
  galeria: [],
  configuracoes: null,
  activeFilterReservas: 'todas',
  searchTermReservas: '',
  calCurrentMonth: new Date(),
  calSelectedDate: null,
};

// Mapeamento de rotas e títulos
const routes = {
  '/admin/login': { title: 'Login do Administrador', isAuth: true },
  '/admin': { title: 'Dashboard', sectionId: 'dashboard' },
  '/admin/reservas': { title: 'Reservas', sectionId: 'reservas' },
  '/admin/calendario': { title: 'Calendário Mensal', sectionId: 'calendario' },
  '/admin/disponibilidade': { title: 'Bloqueio de Datas', sectionId: 'disponibilidade' },
  '/admin/salas': { title: 'Salas Privadas', sectionId: 'salas' },
  '/admin/cardapio': { title: 'Cardápio', sectionId: 'cardapio' },
  '/admin/cardapio/pdf': { title: 'PDF do Cardápio', sectionId: 'cardapio-pdf' },
  '/admin/galeria': { title: 'Galeria de Mídia', sectionId: 'galeria' },
  '/admin/configuracoes': { title: 'Configurações', sectionId: 'configuracoes' },
};

// ============================================================================
// 2. SISTEMA DE NOTIFICAÇÕES TOAST E CONFIRMAÇÃO MODAL
// ============================================================================
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;

  let icon = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`;
  if (type === 'success') {
    icon = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>`;
  } else if (type === 'error') {
    icon = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>`;
  }

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

let pendingConfirmAction = null;
export function showConfirmModal({ title, message, confirmText = 'Confirmar', confirmBtnClass = 'btn-admin-danger', onConfirm }) {
  const modal = document.getElementById('adminConfirmModal');
  const titleEl = document.getElementById('confirmModalTitle');
  const msgEl = document.getElementById('confirmModalMessage');
  const actionBtn = document.getElementById('confirmModalActionBtn');

  if (!modal) return;

  titleEl.textContent = title || 'Confirmação';
  msgEl.textContent = message || 'Tem certeza que deseja executar esta ação?';
  actionBtn.textContent = confirmText;
  actionBtn.className = `btn-admin btn-admin-sm ${confirmBtnClass}`;

  pendingConfirmAction = onConfirm;
  modal.classList.add('open');

  actionBtn.onclick = () => {
    if (pendingConfirmAction) pendingConfirmAction();
    closeConfirmModal();
  };
}

window.closeConfirmModal = () => {
  const modal = document.getElementById('adminConfirmModal');
  if (modal) modal.classList.remove('open');
  pendingConfirmAction = null;
};

// ============================================================================
// 3. ROTEAMENTO DO CLIENTE (SPA)
// ============================================================================
export function navigate(path, replace = false) {
  let target = path;
  if (!routes[target]) {
    target = '/admin';
  }

  // Guarda de rota de autenticação
  if (!state.user && target !== '/admin/login') {
    sessionStorage.setItem('admin_target_route', target);
    target = '/admin/login';
  } else if (state.user && target === '/admin/login') {
    target = sessionStorage.getItem('admin_target_route') || '/admin';
    sessionStorage.removeItem('admin_target_route');
  }

  state.currentRoute = target;
  if (replace) {
    history.replaceState({ path: target }, '', target);
  } else {
    history.pushState({ path: target }, '', target);
  }

  renderApp();
}

window.addEventListener('popstate', (e) => {
  const path = window.location.pathname || '/admin';
  navigate(path, true);
});

// ============================================================================
// 4. FIREBASE AUTHENTICATION (LOGIN, LOGOUT, RESET DE SENHA)
// ============================================================================
onAuthStateChanged(auth, async (user) => {
  state.user = user;
  if (user) {
    // Carrega dados iniciais das coleções do Firestore
    await Promise.allSettled([
      fetchReservas(),
      fetchBloqueios(),
      fetchSalas(),
      fetchCardapio(),
      fetchCategorias(),
      fetchGaleria(),
      fetchConfiguracoes(),
    ]);

    const initialRoute = window.location.pathname;
    if (initialRoute === '/admin/login' || !routes[initialRoute]) {
      navigate('/admin', true);
    } else {
      navigate(initialRoute, true);
    }
  } else {
    navigate('/admin/login', true);
  }
});

async function handleLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('adminLoginEmail');
  const passInput = document.getElementById('adminLoginPassword');
  const alertEl = document.getElementById('adminLoginAlert');
  const submitBtn = document.getElementById('adminLoginBtn');

  const email = emailInput?.value?.trim();
  const password = passInput?.value;

  if (!email || !password) {
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.textContent = 'Por favor, informe seu e-mail e senha de administrador.';
    }
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <div style="width: 18px; height: 18px; border: 2px solid #000; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <span>Autenticando...</span>`;

    if (alertEl) alertEl.style.display = 'none';

    await signInWithEmailAndPassword(auth, email, password);
    showToast('Acesso concedido com sucesso ao painel.', 'success');
  } catch (error) {
    console.error('Erro de autenticação:', error);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Entrar</span>';

    if (alertEl) {
      alertEl.style.display = 'block';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        alertEl.textContent = 'E-mail ou senha incorretos. Verifique suas credenciais.';
      } else if (error.code === 'auth/too-many-requests') {
        alertEl.textContent = 'Muitas tentativas sem sucesso. Aguarde alguns minutos antes de tentar novamente.';
      } else {
        alertEl.textContent = `Falha na autenticação: ${error.message || 'Verifique sua conexão.'}`;
      }
    }
  }
}

async function handlePasswordReset() {
  const emailInput = document.getElementById('adminLoginEmail');
  let email = emailInput?.value?.trim();

  if (!email) {
    email = prompt('Digite seu e-mail de administrador para receber as instruções de redefinição de senha:');
  }

  if (!email) return;

  try {
    await sendPasswordResetEmail(auth, email);
    alert(`E-mail de recuperação de senha enviado para "${email}". Verifique sua caixa de entrada e pasta de spam.`);
    showToast('E-mail de recuperação enviado.', 'info');
  } catch (error) {
    console.error('Erro reset de senha:', error);
    alert(`Não foi possível enviar o e-mail: ${error.message}`);
  }
}

async function handleLogout() {
  showConfirmModal({
    title: 'Sair do Painel',
    message: 'Deseja realmente encerrar sua sessão de administrador?',
    confirmText: 'Sair Agora',
    confirmBtnClass: 'btn-admin-danger',
    onConfirm: async () => {
      try {
        await signOut(auth);
        showToast('Sessão encerrada com sucesso.', 'info');
        navigate('/admin/login', true);
      } catch (err) {
        console.error('Erro ao sair:', err);
      }
    }
  });
}

// ============================================================================
// 5. FETCHERS E SERVIÇOS FIRESTORE
// ============================================================================

// 5.1 Reservas (lê de 'reservas' e unifica com 'agendamentos')
async function fetchReservas() {
  try {
    const q1 = query(collection(db, 'reservas'), orderBy('criadoEm', 'desc'));
    const snap1 = await getDocs(q1);
    const list = snap1.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fallback: busca também em 'agendamentos' caso existam registros não sincronizados
    try {
      const q2 = query(collection(db, 'agendamentos'), orderBy('criadoEm', 'desc'));
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(d => {
        const data = d.data();
        if (!list.some(r => r.id === d.id || (r.whatsapp === data.whatsapp && r.data === data.data && r.sala === data.sala))) {
          list.push({ id: d.id, ...data });
        }
      });
    } catch(e) {}

    state.reservas = list;
    return list;
  } catch (err) {
    console.warn('Erro ao carregar reservas:', err);
    return [];
  }
}

// 5.2 Bloqueios Manuais
async function fetchBloqueios() {
  try {
    const snap = await getDocs(collection(db, 'bloqueios'));
    state.bloqueios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return state.bloqueios;
  } catch (err) {
    console.warn('Erro ao carregar bloqueios:', err);
    return [];
  }
}

// 5.3 Salas
async function fetchSalas() {
  try {
    const snap = await getDocs(collection(db, 'salas'));
    if (snap.empty) {
      // Inicialização das salas padrão caso a coleção esteja vazia
      const defaultSalas = [
        {
          id: 'sala-red',
          nome: 'Sala Red',
          slug: 'sala-red',
          capacidade: 30,
          precoTotal: 800,
          sinal: 400,
          restante: 400,
          descricao: 'Ambiente intimista e vibrante com iluminação vermelha cênica.',
          imagem: '/assets/drinks/balde-heineken.webp',
          ativo: true,
          ordem: 1,
        },
        {
          id: 'sala-green',
          nome: 'Sala Green',
          slug: 'sala-green',
          capacidade: 40,
          precoTotal: 900,
          sinal: 450,
          restante: 450,
          descricao: 'Recomendado entre 30 e 35 pessoas para maior conforto.',
          imagem: '/assets/drinks/aperol-spritz.webp',
          ativo: true,
          ordem: 2,
        },
        {
          id: 'sala-blue',
          nome: 'Sala Blue',
          slug: 'sala-blue',
          capacidade: 50,
          precoTotal: 1000,
          sinal: 500,
          restante: 500,
          descricao: 'Nossa maior sala vip com capacidade estendida e sistema premium.',
          imagem: '/assets/brand/microfone-profissional.jpg',
          ativo: true,
          ordem: 3,
        }
      ];

      // Salva no Firestore
      for (const s of defaultSalas) {
        await setDoc(doc(db, 'salas', s.id), s);
      }
      state.salas = defaultSalas;
    } else {
      state.salas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return state.salas;
  } catch (err) {
    console.warn('Erro ao carregar salas:', err);
    return [];
  }
}

// 5.4 Cardápio e Categorias
async function fetchCategorias() {
  try {
    const snap = await getDocs(collection(db, 'categorias_cardapio'));
    if (snap.empty) {
      const defaultCats = [
        { id: 'petiscos', nome: 'Petiscos de Boteco', ordem: 1, ativo: true },
        { id: 'chapas', nome: 'Chapas Especiais', ordem: 2, ativo: true },
        { id: 'drinks', nome: 'Drinks Autorais', ordem: 3, ativo: true },
        { id: 'cervejas', nome: 'Cervejas e Chopps', ordem: 4, ativo: true },
        { id: 'combos', nome: 'Whiskies e Combos', ordem: 5, ativo: true },
        { id: 'nao-alcoolicos', nome: 'Não Alcoólicos', ordem: 6, ativo: true },
      ];
      for (const c of defaultCats) {
        await setDoc(doc(db, 'categorias_cardapio', c.id), c);
      }
      state.categorias = defaultCats;
    } else {
      state.categorias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return state.categorias;
  } catch (err) {
    console.warn('Erro ao carregar categorias:', err);
    return [];
  }
}

async function fetchCardapio() {
  try {
    const snap = await getDocs(collection(db, 'cardapio'));
    state.cardapio = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return state.cardapio;
  } catch (err) {
    console.warn('Erro ao carregar cardápio:', err);
    return [];
  }
}

// 5.5 Galeria
async function fetchGaleria() {
  try {
    const snap = await getDocs(collection(db, 'galeria'));
    state.galeria = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return state.galeria;
  } catch (err) {
    console.warn('Erro ao carregar galeria:', err);
    return [];
  }
}

// 5.6 Configurações
async function fetchConfiguracoes() {
  try {
    const docRef = doc(db, 'configuracoes', 'geral');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      state.configuracoes = docSnap.data();
    } else {
      const defaultConf = {
        whatsapp: '556181426321',
        instagram: '@backstagekaraoke',
        mapsUrl: 'https://maps.app.goo.gl/AwFhL4Z4Au6cqu4v6',
        endereco: 'CLN 307, Bloco A, Subsolo - Asa Norte, Brasília - DF',
        horarios: {
          terca: '19:00 → 02:30 (madrugada de quarta)',
          quarta: '19:00 → 03:30 (madrugada de quinta)',
          quinta: '19:00 → 03:30 (madrugada de sexta)',
          sexta: '19:00 → 03:30 (madrugada de sábado)',
          sabado: '19:00 → 03:30 (madrugada de domingo)',
          domingo: 'FECHADO',
          segunda: 'FECHADO'
        },
        contatoEmail: 'MPLACERDA921@GMAIL.COM',
        pdfUrl: '/cardapio-oficial.pdf'
      };
      await setDoc(docRef, defaultConf);
      state.configuracoes = defaultConf;
    }
    return state.configuracoes;
  } catch (err) {
    console.warn('Erro ao carregar configurações:', err);
    return null;
  }
}

// ============================================================================
// 6. RENDERIZAÇÃO DA INTERFACE DO PAINEL
// ============================================================================
function renderApp() {
  const appContainer = document.getElementById('adminApp');
  if (!appContainer) return;

  // 1. Tela de Login se não autenticado
  if (!state.user || state.currentRoute === '/admin/login') {
    appContainer.innerHTML = renderLoginView();
    attachLoginEvents();
    return;
  }

  // 2. Shell Completo com Barra Lateral e Conteúdo
  appContainer.innerHTML = `
    <div class="admin-shell">
      <!-- Sidebar Overlay Mobile -->
      <div class="sidebar-overlay" id="sidebarOverlay" onclick="window.toggleAdminSidebar(false)"></div>

      <!-- Barra Lateral Administrativa -->
      <aside class="admin-sidebar" id="adminSidebar">
        <div class="sidebar-header">
          <a href="/admin" class="sidebar-logo-link" onclick="event.preventDefault(); window.adminNav('/admin');">
            <img src="/assets/brand/logo.svg" alt="Backstage Karaokê" class="sidebar-logo">
            <span class="sidebar-brand-sub">Painel Administrativo</span>
          </a>
          <button type="button" class="sidebar-close-btn" onclick="window.toggleAdminSidebar(false)" aria-label="Fechar menu">&times;</button>
        </div>

        <nav class="sidebar-nav">
          <button type="button" class="nav-item-btn ${state.currentRoute === '/admin' ? 'active' : ''}" onclick="window.adminNav('/admin')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Dashboard</span>
          </button>

          <button type="button" class="nav-item-btn ${state.currentRoute === '/admin/reservas' ? 'active' : ''}" onclick="window.adminNav('/admin/reservas')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>Reservas</span>
          </button>

          <button type="button" class="nav-item-btn ${state.currentRoute === '/admin/calendario' ? 'active' : ''}" onclick="window.adminNav('/admin/calendario')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Calendário</span>
          </button>

          <button type="button" class="nav-item-btn ${state.currentRoute === '/admin/disponibilidade' ? 'active' : ''}" onclick="window.adminNav('/admin/disponibilidade')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            <span>Disponibilidade</span>
          </button>

          <button type="button" class="nav-item-btn ${state.currentRoute === '/admin/salas' ? 'active' : ''}" onclick="window.adminNav('/admin/salas')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Salas</span>
          </button>

          <button type="button" class="nav-item-btn ${state.currentRoute === '/admin/cardapio' ? 'active' : ''}" onclick="window.adminNav('/admin/cardapio')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            <span>Cardápio</span>
          </button>

          <button type="button" class="nav-item-btn ${state.currentRoute === '/admin/cardapio/pdf' ? 'active' : ''}" onclick="window.adminNav('/admin/cardapio/pdf')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
            <span>PDF do Cardápio</span>
          </button>

          <button type="button" class="nav-item-btn ${state.currentRoute === '/admin/galeria' ? 'active' : ''}" onclick="window.adminNav('/admin/galeria')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Galeria</span>
          </button>

          <button type="button" class="nav-item-btn ${state.currentRoute === '/admin/configuracoes' ? 'active' : ''}" onclick="window.adminNav('/admin/configuracoes')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Configurações</span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <div class="admin-user-info">
            <div class="user-avatar">${(state.user.email || 'A').charAt(0).toUpperCase()}</div>
            <div class="user-meta">
              <div class="user-email-label" title="${state.user.email}">${state.user.email}</div>
              <div class="user-role-badge">Online</div>
            </div>
          </div>
          <button type="button" class="btn-signout" onclick="window.adminLogout()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <!-- Área de Conteúdo Principal -->
      <main class="admin-main">
        <header class="admin-topbar">
          <div class="topbar-left">
            <button type="button" class="sidebar-toggle-btn" onclick="window.toggleAdminSidebar(true)" aria-label="Abrir menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h1 class="topbar-page-title">${routes[state.currentRoute]?.title || 'Painel Administrativo'}</h1>
          </div>

          <div class="topbar-right">
            <div class="topbar-badge">Sistema Conectado</div>
          </div>
        </header>

        <section class="admin-content-view">
          ${renderCurrentSection()}
        </section>
      </main>
    </div>
  `;

  attachViewEvents();
}

// 6.1 View de Login
function renderLoginView() {
  return `
    <div class="admin-auth-screen">
      <div class="auth-card">
        <div class="auth-header">
          <img src="/assets/brand/logo.svg" alt="Backstage Karaokê" class="auth-logo">
          <div><span class="auth-badge">Acesso Restrito</span></div>
          <h1 class="auth-title">Painel Administrativo</h1>
          <p class="auth-subtitle">Faça login com suas credenciais do Firebase</p>
        </div>

        <form class="auth-form" id="adminLoginForm">
          <div class="form-group">
            <label class="form-label" for="adminLoginEmail">E-mail de Administrador</label>
            <input type="email" id="adminLoginEmail" class="form-input" placeholder="MPLACERDA921@GMAIL.COM" required autocomplete="username">
          </div>

          <div class="form-group">
            <label class="form-label" for="adminLoginPassword">Senha</label>
            <div class="input-password-wrap">
              <input type="password" id="adminLoginPassword" class="form-input" placeholder="••••••••" required autocomplete="current-password">
              <button type="button" class="password-toggle-btn" id="togglePasswordBtn" aria-label="Mostrar senha">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          <div id="adminLoginAlert" style="display: none; padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #FCA5A5;"></div>

          <div class="auth-actions">
            <button type="submit" class="btn-admin btn-admin-primary btn-admin-full" id="adminLoginBtn">
              <span>Entrar</span>
            </button>
            <button type="button" class="auth-forgot-btn" id="adminForgotBtn">Esqueci minha senha</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function attachLoginEvents() {
  const form = document.getElementById('adminLoginForm');
  if (form) form.addEventListener('submit', handleLogin);

  const forgotBtn = document.getElementById('adminForgotBtn');
  if (forgotBtn) forgotBtn.addEventListener('click', handlePasswordReset);

  const toggleBtn = document.getElementById('togglePasswordBtn');
  const passInput = document.getElementById('adminLoginPassword');
  if (toggleBtn && passInput) {
    toggleBtn.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
    });
  }
}

// 6.2 Renderizador das Seções
function renderCurrentSection() {
  switch (state.currentRoute) {
    case '/admin':
      return renderDashboardView();
    case '/admin/reservas':
      return renderReservasView();
    case '/admin/calendario':
      return renderCalendarioView();
    case '/admin/disponibilidade':
      return renderDisponibilidadeView();
    case '/admin/salas':
      return renderSalasView();
    case '/admin/cardapio':
      return renderCardapioView();
    case '/admin/cardapio/pdf':
      return renderCardapioPdfView();
    case '/admin/galeria':
      return renderGaleriaView();
    case '/admin/configuracoes':
      return renderConfiguracoesView();
    default:
      return renderDashboardView();
  }
}

// ============================================================================
// 7. VIEWS DETALHADAS
// ============================================================================

// 7.1 Dashboard
function renderDashboardView() {
  const pendentes = state.reservas.filter(r => (r.status || '').toUpperCase() === 'PENDING' || (r.status || '').toLowerCase() === 'pendente').length;
  const confirmadas = state.reservas.filter(r => (r.status || '').toUpperCase() === 'CONFIRMED' || (r.status || '').toLowerCase() === 'confirmada').length;
  const canceladas = state.reservas.filter(r => (r.status || '').toUpperCase() === 'CANCELLED' || (r.status || '').toLowerCase() === 'cancelada').length;
  const bloqueiosCount = state.bloqueios.length;

  const ultimasReservas = state.reservas.slice(0, 5);

  return `
    <div class="view-header">
      <div class="view-headline">
        <h2>Visão Geral do Backstage</h2>
        <p>Acompanhe em tempo real o status de reservas e disponibilidade das salas</p>
      </div>
      <div class="view-actions">
        <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" onclick="window.adminNav('/admin/reservas')">
          Gerenciar Reservas
        </button>
      </div>
    </div>

    <!-- Cards de Estatísticas -->
    <div class="admin-stats-grid">
      <div class="stat-card">
        <div class="stat-icon yellow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="stat-meta">
          <div class="stat-title">Reservas Pendentes</div>
          <div class="stat-value" style="color: var(--admin-yellow);">${pendentes}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="stat-meta">
          <div class="stat-title">Reservas Confirmadas</div>
          <div class="stat-value" style="color: var(--admin-green);">${confirmadas}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <div class="stat-meta">
          <div class="stat-title">Reservas Canceladas</div>
          <div class="stat-value" style="color: var(--admin-red);">${canceladas}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon cyan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        </div>
        <div class="stat-meta">
          <div class="stat-title">Datas Bloqueadas</div>
          <div class="stat-value" style="color: var(--admin-cyan);">${bloqueiosCount}</div>
        </div>
      </div>
    </div>

    <!-- Tabela de Próximas Reservas -->
    <div class="admin-card">
      <div class="admin-card-header">
        <h3 class="admin-card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Próximas Reservas Recebidas
        </h3>
        <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" onclick="window.adminNav('/admin/reservas')">Ver Todas →</button>
      </div>

      ${ultimasReservas.length === 0 ? `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <div class="empty-state-title">Nenhuma reserva registrada ainda</div>
          <p class="empty-state-desc">Assim que os clientes agendarem pelo site ou WhatsApp, os pedidos aparecerão aqui instantaneamente.</p>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>WhatsApp</th>
                <th>Data / Horário</th>
                <th>Sala</th>
                <th>Pessoas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${ultimasReservas.map(r => renderReservaRow(r)).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// 7.2 Reservas
function renderReservasView() {
  let list = [...state.reservas];

  if (state.activeFilterReservas === 'pendentes') {
    list = list.filter(r => (r.status || '').toUpperCase() === 'PENDING' || (r.status || '').toLowerCase() === 'pendente');
  } else if (state.activeFilterReservas === 'confirmadas') {
    list = list.filter(r => (r.status || '').toUpperCase() === 'CONFIRMED' || (r.status || '').toLowerCase() === 'confirmada');
  } else if (state.activeFilterReservas === 'canceladas') {
    list = list.filter(r => (r.status || '').toUpperCase() === 'CANCELLED' || (r.status || '').toLowerCase() === 'cancelada');
  }

  if (state.searchTermReservas) {
    const s = state.searchTermReservas.toLowerCase();
    list = list.filter(r => 
      (r.nome || '').toLowerCase().includes(s) ||
      (r.whatsapp || '').includes(s) ||
      (r.data || '').toLowerCase().includes(s) ||
      (r.sala || '').toLowerCase().includes(s)
    );
  }

  return `
    <div class="view-header">
      <div class="view-headline">
        <h2>Gerenciamento de Reservas</h2>
        <p>Confirme ou cancele solicitações de salas com registro de histórico e controle de ocupação</p>
      </div>
      <div class="view-actions">
        <button type="button" class="btn-admin btn-admin-outline btn-admin-sm" onclick="window.refreshReservas()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Atualizar
        </button>
      </div>
    </div>

    <!-- Barra de Filtros e Busca -->
    <div class="admin-card" style="padding: 16px 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn-admin btn-admin-sm ${state.activeFilterReservas === 'todas' ? 'btn-admin-primary' : 'btn-admin-outline'}" onclick="window.filterReservas('todas')">Todas (${state.reservas.length})</button>
          <button type="button" class="btn-admin btn-admin-sm ${state.activeFilterReservas === 'pendentes' ? 'btn-admin-primary' : 'btn-admin-outline'}" onclick="window.filterReservas('pendentes')">Pendentes</button>
          <button type="button" class="btn-admin btn-admin-sm ${state.activeFilterReservas === 'confirmadas' ? 'btn-admin-primary' : 'btn-admin-outline'}" onclick="window.filterReservas('confirmadas')">Confirmadas</button>
          <button type="button" class="btn-admin btn-admin-sm ${state.activeFilterReservas === 'canceladas' ? 'btn-admin-primary' : 'btn-admin-outline'}" onclick="window.filterReservas('canceladas')">Canceladas</button>
        </div>

        <div style="max-width: 320px; width: 100%;">
          <input type="text" class="form-input" placeholder="Buscar por cliente ou WhatsApp..." value="${state.searchTermReservas}" oninput="window.searchReservas(this.value)">
        </div>
      </div>
    </div>

    <!-- Tabela de Reservas -->
    <div class="admin-card">
      ${list.length === 0 ? `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <div class="empty-state-title">Nenhuma reserva encontrada</div>
          <p class="empty-state-desc">Não há registros para o filtro ou termo de busca selecionado.</p>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>WhatsApp</th>
                <th>Data / Horário</th>
                <th>Sala</th>
                <th>Convidados</th>
                <th>Aceite Termos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(r => renderReservaRow(r)).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function renderReservaRow(r) {
  const st = (r.status || 'PENDING').toUpperCase();
  let badgeClass = 'pending';
  let badgeLabel = 'Pendente';

  if (st === 'CONFIRMED' || st === 'CONFIRMADA') {
    badgeClass = 'confirmed';
    badgeLabel = 'Confirmada';
  } else if (st === 'CANCELLED' || st === 'CANCELADA') {
    badgeClass = 'cancelled';
    badgeLabel = 'Cancelada';
  }

  const cleanPhone = (r.whatsapp || '').replace(/\D/g, '');
  const wppLink = cleanPhone ? `https://wa.me/55${cleanPhone}` : '#';

  let roomClass = 'red';
  if ((r.sala || '').includes('Green')) roomClass = 'green';
  if ((r.sala || '').includes('Blue')) roomClass = 'blue';

  return `
    <tr>
      <td>
        <strong style="color: var(--admin-text-main);">${r.nome || 'Cliente não identificado'}</strong>
        <div style="font-size: 0.75rem; color: var(--admin-text-dim);">Criado em: ${formatTimestamp(r.criadoEm || r.dataCriacao)}</div>
      </td>
      <td>
        <a href="${wppLink}" target="_blank" rel="noopener noreferrer" style="color: var(--admin-cyan); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z"/></svg>
          ${r.whatsapp || '-'}
        </a>
      </td>
      <td>
        <span style="font-weight: 700;">${r.data || 'A definir'}</span>
        ${r.horario ? `<div style="font-size: 0.8rem; color: var(--admin-text-muted);">${r.horario}</div>` : ''}
      </td>
      <td>
        <span class="badge-room ${roomClass}">${r.sala || 'Sala'}</span>
      </td>
      <td>
        <span>${r.pessoas ? `${r.pessoas} pessoas` : '-'}</span>
      </td>
      <td>
        <span style="font-size: 0.75rem; color: var(--admin-green); font-weight: 700;">✓ Termos Aceitos</span>
      </td>
      <td>
        <span class="badge-status ${badgeClass}">${badgeLabel}</span>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          ${st !== 'CONFIRMED' && st !== 'CONFIRMADA' ? `
            <button type="button" class="btn-admin btn-admin-success btn-admin-xs" onclick="window.confirmarReserva('${r.id}')" title="Confirmar Reserva">
              Confirmar
            </button>
          ` : ''}

          ${st !== 'CANCELLED' && st !== 'CANCELADA' ? `
            <button type="button" class="btn-admin btn-admin-danger btn-admin-xs" onclick="window.cancelarReserva('${r.id}')" title="Cancelar Reserva">
              Cancelar
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}

// 7.3 Calendário Mensal
function renderCalendarioView() {
  const current = state.calCurrentMonth;
  const year = current.getFullYear();
  const month = current.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const selectedDateStr = state.calSelectedDate ? formatDateISO(state.calSelectedDate) : null;

  return `
    <div class="view-header">
      <div class="view-headline">
        <h2>Calendário Operacional</h2>
        <p>Visão de ocupação por data, funcionamento noturno e disponibilidade de salas</p>
      </div>
      <div class="view-actions">
        <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" onclick="window.adminNav('/admin/disponibilidade')">
          + Bloquear Data/Horário
        </button>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr; gap: 24px;">
      <!-- Calendário Widget -->
      <div class="admin-cal-wrapper">
        <div class="cal-header-bar">
          <div class="cal-title-month">${monthNames[month]} de ${year}</div>
          <div class="cal-nav-buttons">
            <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" onclick="window.calPrevMonth()">‹ Anterior</button>
            <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" onclick="window.calToday()">Hoje</button>
            <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" onclick="window.calNextMonth()">Próximo ›</button>
          </div>
        </div>

        <div class="cal-grid">
          <div class="cal-day-label" style="color: #F87171;">Dom</div>
          <div class="cal-day-label" style="color: #F87171;">Seg</div>
          <div class="cal-day-label">Ter</div>
          <div class="cal-day-label">Qua</div>
          <div class="cal-day-label">Qui</div>
          <div class="cal-day-label">Sex</div>
          <div class="cal-day-label">Sáb</div>

          ${Array.from({ length: firstDay }).map(() => `<div></div>`).join('')}

          ${Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateObj = new Date(year, month, dayNum);
            const dateISO = formatDateISO(dateObj);
            const dayOfWeek = dateObj.getDay();
            const isClosed = dayOfWeek === 0 || dayOfWeek === 1; // Dom e Seg fechados

            const isSelected = selectedDateStr === dateISO;

            // Busca reservas e bloqueios deste dia
            const dayReservas = state.reservas.filter(r => matchesDate(r.data, dateObj));
            const hasConfirmed = dayReservas.some(r => (r.status || '').toUpperCase() === 'CONFIRMED' || (r.status || '').toLowerCase() === 'confirmada');
            const hasPending = dayReservas.some(r => (r.status || '').toUpperCase() === 'PENDING' || (r.status || '').toLowerCase() === 'pendente');
            const isBlocked = state.bloqueios.some(b => b.data === dateISO);

            return `
              <div class="cal-cell ${isSelected ? 'selected' : ''} ${isClosed ? 'closed-day' : ''}" onclick="window.selectCalDate('${dateISO}')">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="cal-cell-num">${dayNum}</span>
                  ${isClosed ? `<span style="font-size: 0.65rem; color: #FCA5A5; font-weight: 700;">FECHADO</span>` : ''}
                </div>

                <div class="cal-cell-badges">
                  ${isBlocked ? `<span class="cal-mini-badge blocked">INDISPONÍVEL</span>` : ''}
                  ${hasConfirmed ? `<span class="cal-mini-badge confirmed">CONFIRMADO</span>` : ''}
                  ${hasPending ? `<span class="cal-mini-badge pending">PENDENTE</span>` : ''}
                  ${!isClosed && !isBlocked && !hasConfirmed && !hasPending ? `<span class="cal-mini-badge" style="background: rgba(255,255,255,0.05); color: var(--admin-text-dim);">DISPONÍVEL</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Detalhes da Data Selecionada -->
      ${renderSelectedDateDetails()}
    </div>
  `;
}

function renderSelectedDateDetails() {
  if (!state.calSelectedDate) {
    return `
      <div class="admin-card">
        <div class="empty-state" style="padding: 24px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <div class="empty-state-title">Selecione uma data no calendário</div>
          <p class="empty-state-desc">Clique em qualquer dia do mês acima para ver a escala de salas, horários de funcionamento e status detalhado.</p>
        </div>
      </div>
    `;
  }

  const d = state.calSelectedDate;
  const dateISO = formatDateISO(d);
  const dayOfWeek = d.getDay();

  // Regra de Horário de Funcionamento estrita:
  // Domingo e Segunda: Fechado
  // Terça: 19:00 → 02:30 (madrugada de quarta)
  // Quarta a Sábado: 19:00 → 03:30 (madrugada do dia seguinte)
  let horarioLabel = '19:00 → 03:30 (madrugada do dia seguinte)';
  let isClosed = false;

  if (dayOfWeek === 0 || dayOfWeek === 1) {
    isClosed = true;
    horarioLabel = 'FECHADO (Não abre aos domingos e segundas)';
  } else if (dayOfWeek === 2) {
    horarioLabel = '19:00 → 02:30 (madrugada de quarta)';
  }

  const dayReservas = state.reservas.filter(r => matchesDate(r.data, d));
  const dayBloqueios = state.bloqueios.filter(b => b.data === dateISO);

  return `
    <div class="admin-card">
      <div class="admin-card-header">
        <div>
          <h3 class="admin-card-title">${formatDisplayDate(d)}</h3>
          <p style="font-size: 0.85rem; color: var(--admin-text-muted); margin-top: 4px;">
            Horário Operacional: <strong style="color: ${isClosed ? '#EF4444' : 'var(--admin-cyan)'};">${horarioLabel}</strong>
          </p>
        </div>

        <div style="display: flex; gap: 8px;">
          ${!isClosed ? `
            <button type="button" class="btn-admin btn-admin-danger btn-admin-xs" onclick="window.bloquearDiaInteiro('${dateISO}')">
              Bloquear Dia Inteiro
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Salas e seus Status no Dia -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
        ${['Sala Red', 'Sala Green', 'Sala Blue'].map(salaNome => {
          let salaStatus = 'DISPONÍVEL';
          let statusColor = 'var(--admin-green)';

          if (isClosed) {
            salaStatus = 'INDISPONÍVEL (Fechado)';
            statusColor = '#EF4444';
          } else {
            const block = dayBloqueios.find(b => b.sala === 'todas' || b.sala === salaNome);
            if (block) {
              salaStatus = `INDISPONÍVEL (${block.motivo || 'Bloqueio Manual'})`;
              statusColor = '#C084FC';
            } else {
              const res = dayReservas.find(r => (r.sala || '').includes(salaNome.replace('Sala ', '')));
              if (res) {
                const st = (res.status || '').toUpperCase();
                if (st === 'CONFIRMED' || st === 'CONFIRMADA') {
                  salaStatus = 'CONFIRMADO';
                  statusColor = 'var(--admin-cyan)';
                } else if (st === 'PENDING' || st === 'PENDENTE') {
                  salaStatus = 'PENDENTE';
                  statusColor = 'var(--admin-yellow)';
                }
              }
            }
          }

          return `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--admin-border); border-radius: 10px; padding: 16px;">
              <div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 6px;">${salaNome}</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: ${statusColor};">
                Status: ${salaStatus}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Reservas do Dia -->
      <div style="margin-top: 24px;">
        <h4 style="font-size: 0.95rem; font-weight: 800; text-transform: uppercase; color: var(--admin-text-muted); margin-bottom: 12px;">Reservas Deste Dia (${dayReservas.length})</h4>
        ${dayReservas.length === 0 ? `
          <p style="font-size: 0.85rem; color: var(--admin-text-dim);">Nenhuma reserva registrada para esta data.</p>
        ` : `
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>WhatsApp</th>
                  <th>Sala</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                ${dayReservas.map(r => renderReservaRow(r)).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}

// 7.4 Disponibilidade / Bloqueio Manual
function renderDisponibilidadeView() {
  return `
    <div class="view-header">
      <div class="view-headline">
        <h2>Bloqueio Manual de Datas e Horários</h2>
        <p>Defina indisponibilidades para manutenções, eventos corporativos fechados ou feriados</p>
      </div>
    </div>

    <!-- Formulário de Novo Bloqueio -->
    <div class="admin-card">
      <div class="admin-card-header">
        <h3 class="admin-card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          Adicionar Novo Bloqueio
        </h3>
      </div>

      <form id="formNovoBloqueio" onsubmit="window.handleSalvarBloqueio(event)">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
          <div class="form-group">
            <label class="form-label" for="blockData">Data *</label>
            <input type="date" id="blockData" class="form-input" required>
          </div>

          <div class="form-group">
            <label class="form-label" for="blockTipo">Tipo de Bloqueio *</label>
            <select id="blockTipo" class="form-select" onchange="window.handleTipoBloqueioChange(this.value)">
              <option value="dia_inteiro">Dia Inteiro Indisponível (Todas as salas)</option>
              <option value="sala_horario">Sala e Horário Específicos</option>
              <option value="horario_especifico">Horário Específico (Todas as salas)</option>
            </select>
          </div>

          <div class="form-group" id="blockSalaGroup" style="display: none;">
            <label class="form-label" for="blockSala">Sala</label>
            <select id="blockSala" class="form-select">
              <option value="todas">Todas as Salas</option>
              <option value="Sala Red">Sala Red</option>
              <option value="Sala Green">Sala Green</option>
              <option value="Sala Blue">Sala Blue</option>
            </select>
          </div>

          <div class="form-group" id="blockHorarioGroup" style="display: none;">
            <label class="form-label" for="blockHorario">Horário</label>
            <input type="time" id="blockHorario" class="form-input" value="21:00">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="blockMotivo">Motivo do Bloqueio *</label>
          <input type="text" id="blockMotivo" class="form-input" placeholder="Ex: Manutenção técnica, Evento fechado, Reforma..." required>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
          <button type="submit" class="btn-admin btn-admin-danger" id="btnSalvarBloqueio">
            Bloquear Data/Horário
          </button>
        </div>
      </form>
    </div>

    <!-- Lista de Bloqueios Ativos -->
    <div class="admin-card">
      <div class="admin-card-header">
        <h3 class="admin-card-title">Bloqueios Cadastrados (${state.bloqueios.length})</h3>
      </div>

      ${state.bloqueios.length === 0 ? `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
          <div class="empty-state-title">Nenhum bloqueio manual ativo</div>
          <p class="empty-state-desc">As salas seguirão o horário padrão de funcionamento sem interrupções.</p>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Abrangência</th>
                <th>Horário</th>
                <th>Motivo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${state.bloqueios.map(b => `
                <tr>
                  <td><strong style="color: var(--admin-text-main);">${formatDateBR(b.data)}</strong></td>
                  <td><span class="badge-status blocked">${b.tipo === 'dia_inteiro' ? 'DIA INTEIRO' : (b.sala || 'Todas as Salas')}</span></td>
                  <td>${b.horario || 'Todos os horários'}</td>
                  <td>${b.motivo || '-'}</td>
                  <td>
                    <button type="button" class="btn-admin btn-admin-danger btn-admin-xs" onclick="window.removerBloqueio('${b.id}')">
                      Remover Bloqueio
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// 7.5 Salas Privadas
function renderSalasView() {
  return `
    <div class="view-header">
      <div class="view-headline">
        <h2>Gerenciamento de Salas Privadas</h2>
        <p>Ajuste capacidades, valores de locação, descrições e imagens oficiais</p>
      </div>
      <div class="view-actions">
        <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" onclick="window.openModalNovaSala()">
          + Nova Sala
        </button>
      </div>
    </div>

    <div class="admin-items-grid">
      ${state.salas.map(s => `
        <div class="admin-item-card">
          <img src="${s.imagem || '/assets/brand/hero-bg.webp'}" alt="${s.nome}" class="admin-item-thumb">
          <div class="admin-item-body">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h3 class="admin-item-title">${s.nome}</h3>
              <span class="badge-status ${s.ativo ? 'confirmed' : 'cancelled'}">${s.ativo ? 'Ativa' : 'Inativa'}</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--admin-cyan); font-weight: 700; margin-bottom: 8px;">
              Capacidade: Até ${s.capacidade} pessoas • R$ ${(s.precoTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p class="admin-item-desc">${s.descricao || ''}</p>

            <div class="admin-item-footer">
              <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" onclick="window.editarSala('${s.id}')">
                Editar Sala
              </button>
              <button type="button" class="btn-admin btn-admin-xs ${s.ativo ? 'btn-admin-danger' : 'btn-admin-success'}" onclick="window.toggleAtivoSala('${s.id}', ${!s.ativo})">
                ${s.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 7.6 Cardápio
function renderCardapioView() {
  return `
    <div class="view-header">
      <div class="view-headline">
        <h2>Gerenciamento do Cardápio</h2>
        <p>Edite pratos, porções, drinks, coquetéis e organize as categorias do bar</p>
      </div>
      <div class="view-actions">
        <button type="button" class="btn-admin btn-admin-outline btn-admin-sm" onclick="window.openModalCategoria()">
          + Nova Categoria
        </button>
        <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" onclick="window.openModalItemCardapio()">
          + Novo Item
        </button>
      </div>
    </div>

    <!-- Lista de Categorias -->
    <div class="admin-card">
      <div class="admin-card-header">
        <h3 class="admin-card-title">Categorias Cadastradas (${state.categorias.length})</h3>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${state.categorias.map(c => `
          <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--admin-border); border-radius: 8px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 0.85rem;">${c.nome}</span>
            <button type="button" style="background: none; border: none; color: #EF4444; cursor: pointer; font-size: 1rem; line-height: 1;" onclick="window.excluirCategoria('${c.id}')" title="Excluir Categoria">&times;</button>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Itens do Cardápio -->
    <div class="admin-card">
      <div class="admin-card-header">
        <h3 class="admin-card-title">Itens do Cardápio (${state.cardapio.length})</h3>
      </div>

      ${state.cardapio.length === 0 ? `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>
          <div class="empty-state-title">Nenhum item cadastrado no cardápio</div>
          <p class="empty-state-desc">Clique no botão "+ Novo Item" acima para cadastrar petiscos, porções ou coquetéis autorais.</p>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${state.cardapio.map(it => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                      ${it.imagem ? `<img src="${it.imagem}" alt="${it.nome}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">` : ''}
                      <div>
                        <strong>${it.nome}</strong>
                        <div style="font-size: 0.8rem; color: var(--admin-text-muted);">${it.descricao || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>${it.categoria || '-'}</td>
                  <td><strong style="color: var(--admin-cyan);">R$ ${(it.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
                  <td><span class="badge-status ${it.ativo ? 'confirmed' : 'cancelled'}">${it.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" onclick="window.editarItemCardapio('${it.id}')">Editar</button>
                      <button type="button" class="btn-admin btn-admin-danger btn-admin-xs" onclick="window.excluirItemCardapio('${it.id}')">Excluir</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// 7.7 PDF do Cardápio
function renderCardapioPdfView() {
  const conf = state.configuracoes || {};
  const currentPdfUrl = conf.pdfUrl || '/cardapio-oficial.pdf';

  return `
    <div class="view-header">
      <div class="view-headline">
        <h2>PDF Oficial do Cardápio</h2>
        <p>Gerencie o arquivo PDF para download e visualização pública no site</p>
      </div>
    </div>

    <div class="admin-card">
      <div class="admin-card-header">
        <h3 class="admin-card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Arquivo PDF Vigente
        </h3>
        <a href="${currentPdfUrl}" target="_blank" rel="noopener noreferrer" class="btn-admin btn-admin-primary btn-admin-sm">
          Visualizar PDF Atual ↗
        </a>
      </div>

      <div style="background: rgba(0, 240, 255, 0.05); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 10px; padding: 18px; margin-bottom: 24px;">
        <div style="font-weight: 700; color: var(--admin-cyan); margin-bottom: 4px;">Link Atual Configurado:</div>
        <div style="font-family: monospace; font-size: 0.85rem; color: #FFF; word-break: break-all;">${currentPdfUrl}</div>
      </div>

      <!-- Upload de Novo PDF -->
      <form onsubmit="window.handleUploadPdf(event)" style="border: 2px dashed var(--admin-border); border-radius: 12px; padding: 32px; text-align: center;">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--admin-cyan); margin-bottom: 12px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div style="font-size: 1.1rem; font-weight: 800; margin-bottom: 6px;">Enviar ou Substituir PDF do Cardápio</div>
        <p style="font-size: 0.85rem; color: var(--admin-text-muted); margin-bottom: 18px;">Selecione o arquivo em formato PDF (máximo 25MB). Ele será enviado ao Firebase Storage.</p>

        <input type="file" id="inputPdfCardapio" accept="application/pdf" class="form-input" style="max-width: 380px; margin: 0 auto 16px auto;" required>

        <div id="pdfUploadProgress" style="display: none; max-width: 380px; margin: 0 auto 16px auto;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--admin-cyan); margin-bottom: 4px;">Enviando ao Firebase Storage...</div>
          <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: 100%; background: var(--admin-cyan); animation: pulse 1s infinite;"></div>
          </div>
        </div>

        <div>
          <button type="submit" class="btn-admin btn-admin-primary" id="btnUploadPdf">
            Salvar e Atualizar PDF
          </button>
        </div>
      </form>
    </div>
  `;
}

// 7.8 Galeria de Imagens e Vídeos
function renderGaleriaView() {
  const imagens = state.galeria.filter(g => g.tipo !== 'video');
  const videos = state.galeria.filter(g => g.tipo === 'video');

  return `
    <div class="view-header">
      <div class="view-headline">
        <h2>Galeria de Fotos e Vídeos</h2>
        <p>Gerencie o conteúdo visual do palco, drinks e ambiente exibidos no Backstage</p>
      </div>
      <div class="view-actions">
        <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" onclick="window.openModalGaleria('imagem')">
          + Adicionar Imagem
        </button>
        <button type="button" class="btn-admin btn-admin-magenta btn-admin-sm" onclick="window.openModalGaleria('video')">
          + Adicionar Vídeo
        </button>
      </div>
    </div>

    <!-- Seção de Fotos -->
    <div class="admin-card">
      <div class="admin-card-header">
        <h3 class="admin-card-title">Fotos da Galeria (${imagens.length})</h3>
      </div>

      ${imagens.length === 0 ? `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <div class="empty-state-title">Nenhuma foto adicionada</div>
          <p class="empty-state-desc">Cadastre fotos do espaço, drinks e palco para enriquecer o site.</p>
        </div>
      ` : `
        <div class="admin-items-grid">
          ${imagens.map(img => `
            <div class="admin-item-card">
              <img src="${img.url}" alt="${img.titulo}" class="admin-item-thumb">
              <div class="admin-item-body">
                <h4 class="admin-item-title">${img.titulo || 'Foto sem título'}</h4>
                <div style="font-size: 0.78rem; color: var(--admin-cyan); margin-bottom: 8px;">${img.tag || 'Geral'} • Ordem: ${img.ordem || 1}</div>
                <div class="admin-item-footer">
                  <span class="badge-status ${img.ativo ? 'confirmed' : 'cancelled'}">${img.ativo ? 'Ativa' : 'Inativa'}</span>
                  <button type="button" class="btn-admin btn-admin-danger btn-admin-xs" onclick="window.excluirItemGaleria('${img.id}', '${img.url}')">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Seção de Vídeos -->
    <div class="admin-card">
      <div class="admin-card-header">
        <h3 class="admin-card-title">Vídeos da Galeria (${videos.length})</h3>
      </div>

      ${videos.length === 0 ? `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          <div class="empty-state-title">Nenhum vídeo cadastrado</div>
          <p class="empty-state-desc">Adicione vídeos via URL do YouTube, Instagram ou link direto.</p>
        </div>
      ` : `
        <div class="admin-items-grid">
          ${videos.map(vid => `
            <div class="admin-item-card">
              <div style="height: 180px; background: #000; display: flex; align-items: center; justify-content: center; position: relative;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--admin-magenta)" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              </div>
              <div class="admin-item-body">
                <h4 class="admin-item-title">${vid.titulo || 'Vídeo sem título'}</h4>
                <div style="font-size: 0.78rem; color: var(--admin-text-muted); word-break: break-all; margin-bottom: 8px;">${vid.url}</div>
                <div class="admin-item-footer">
                  <span class="badge-status ${vid.ativo ? 'confirmed' : 'cancelled'}">${vid.ativo ? 'Ativo' : 'Inativo'}</span>
                  <button type="button" class="btn-admin btn-admin-danger btn-admin-xs" onclick="window.excluirItemGaleria('${vid.id}', '${vid.url}')">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// 7.9 Configurações Gerais
function renderConfiguracoesView() {
  const conf = state.configuracoes || {};

  return `
    <div class="view-header">
      <div class="view-headline">
        <h2>Configurações do Backstage</h2>
        <p>Centralize links de redes sociais, WhatsApp oficial, horários e endereço</p>
      </div>
    </div>

    <div class="admin-card">
      <form onsubmit="window.handleSalvarConfiguracoes(event)">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
          <div class="form-group">
            <label class="form-label" for="confWpp">WhatsApp Oficial (somente dígitos)</label>
            <input type="text" id="confWpp" class="form-input" value="${conf.whatsapp || '556181426321'}" required>
          </div>

          <div class="form-group">
            <label class="form-label" for="confInsta">Instagram</label>
            <input type="text" id="confInsta" class="form-input" value="${conf.instagram || '@backstagekaraoke'}" required>
          </div>

          <div class="form-group">
            <label class="form-label" for="confMaps">Link do Google Maps</label>
            <input type="url" id="confMaps" class="form-input" value="${conf.mapsUrl || 'https://maps.app.goo.gl/AwFhL4Z4Au6cqu4v6'}" required>
          </div>

          <div class="form-group">
            <label class="form-label" for="confEmail">E-mail de Contato / Administrador</label>
            <input type="email" id="confEmail" class="form-input" value="${conf.contatoEmail || 'MPLACERDA921@GMAIL.COM'}" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="confEndereco">Endereço Completo</label>
          <input type="text" id="confEndereco" class="form-input" value="${conf.endereco || 'CLN 307, Bloco A, Subsolo - Asa Norte, Brasília - DF'}" required>
        </div>

        <div style="border-top: 1px solid var(--admin-border); margin: 24px 0; padding-top: 20px;">
          <h4 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 12px; color: var(--admin-cyan);">Horários de Funcionamento Oficiais</h4>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
            <div class="form-group">
              <label class="form-label">Terça-feira</label>
              <input type="text" id="confHorarioTerca" class="form-input" value="${conf.horarios?.terca || '19:00 → 02:30 (madrugada de quarta)'}">
            </div>

            <div class="form-group">
              <label class="form-label">Quarta-feira</label>
              <input type="text" id="confHorarioQuarta" class="form-input" value="${conf.horarios?.quarta || '19:00 → 03:30 (madrugada de quinta)'}">
            </div>

            <div class="form-group">
              <label class="form-label">Quinta-feira</label>
              <input type="text" id="confHorarioQuinta" class="form-input" value="${conf.horarios?.quinta || '19:00 → 03:30 (madrugada de sexta)'}">
            </div>

            <div class="form-group">
              <label class="form-label">Sexta-feira</label>
              <input type="text" id="confHorarioSexta" class="form-input" value="${conf.horarios?.sexta || '19:00 → 03:30 (madrugada de sábado)'}">
            </div>

            <div class="form-group">
              <label class="form-label">Sábado</label>
              <input type="text" id="confHorarioSabado" class="form-input" value="${conf.horarios?.sabado || '19:00 → 03:30 (madrugada de domingo)'}">
            </div>

            <div class="form-group">
              <label class="form-label">Domingo e Segunda</label>
              <input type="text" class="form-input" value="FECHADO" disabled style="opacity: 0.7;">
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button type="submit" class="btn-admin btn-admin-primary" id="btnSalvarConfig">
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  `;
}

function attachViewEvents() {
  // Eventos específicos por view se necessário
}

// ============================================================================
// 8. HANDLERS GLOBAIS EXPOSTOS NA WINDOW
// ============================================================================
window.adminNav = (path) => navigate(path);
window.adminLogout = () => handleLogout();
window.toggleAdminSidebar = (open) => {
  const sb = document.getElementById('adminSidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.toggle('open', open);
  if (ov) ov.classList.toggle('open', open);
};

// 8.1 Ações de Reserva
window.confirmarReserva = async (id) => {
  const res = state.reservas.find(r => r.id === id);
  if (!res) return;

  // Verificação de conflito: mesma data + sala
  const conflito = state.reservas.find(r => 
    r.id !== id && 
    r.data === res.data && 
    r.sala === res.sala && 
    ((r.status || '').toUpperCase() === 'CONFIRMED' || (r.status || '').toLowerCase() === 'confirmada')
  );

  if (conflito) {
    if (!confirm(`Atenção: Já existe uma reserva CONFIRMADA para a ${res.sala} na data ${res.data} em nome de "${conflito.nome}". Deseja confirmar mesmo assim?`)) {
      return;
    }
  }

  try {
    const docRef = doc(db, 'reservas', id);
    await updateDoc(docRef, {
      status: 'CONFIRMED',
      confirmadoEm: serverTimestamp()
    });

    // Atualiza estado local
    res.status = 'CONFIRMED';
    showToast('Reserva confirmada com sucesso.', 'success');
    renderApp();
  } catch (err) {
    console.error('Erro ao confirmar reserva:', err);
    showToast('Erro ao confirmar reserva.', 'error');
  }
};

window.cancelarReserva = (id) => {
  showConfirmModal({
    title: 'Cancelar Reserva',
    message: 'Deseja realmente cancelar esta reserva? O horário será liberado para novos clientes.',
    confirmText: 'Sim, Cancelar',
    confirmBtnClass: 'btn-admin-danger',
    onConfirm: async () => {
      try {
        const docRef = doc(db, 'reservas', id);
        await updateDoc(docRef, {
          status: 'CANCELLED',
          canceladoEm: serverTimestamp()
        });

        const r = state.reservas.find(item => item.id === id);
        if (r) r.status = 'CANCELLED';

        showToast('Reserva cancelada.', 'info');
        renderApp();
      } catch (err) {
        console.error('Erro ao cancelar reserva:', err);
        showToast('Erro ao cancelar reserva.', 'error');
      }
    }
  });
};

window.filterReservas = (filtro) => {
  state.activeFilterReservas = filtro;
  renderApp();
};

window.searchReservas = (term) => {
  state.searchTermReservas = term;
  renderApp();
};

window.refreshReservas = async () => {
  await fetchReservas();
  showToast('Lista de reservas atualizada.', 'info');
  renderApp();
};

// 8.2 Ações do Calendário
window.calPrevMonth = () => {
  const d = state.calCurrentMonth;
  state.calCurrentMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  renderApp();
};

window.calNextMonth = () => {
  const d = state.calCurrentMonth;
  state.calCurrentMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  renderApp();
};

window.calToday = () => {
  state.calCurrentMonth = new Date();
  state.calSelectedDate = new Date();
  renderApp();
};

window.selectCalDate = (isoStr) => {
  const [y, m, d] = isoStr.split('-').map(Number);
  state.calSelectedDate = new Date(y, m - 1, d);
  renderApp();
};

window.bloquearDiaInteiro = (isoStr) => {
  state.currentRoute = '/admin/disponibilidade';
  renderApp();
  setTimeout(() => {
    const dataInput = document.getElementById('blockData');
    if (dataInput) dataInput.value = isoStr;
  }, 100);
};

// 8.3 Ações de Bloqueio
window.handleTipoBloqueioChange = (val) => {
  const salaGroup = document.getElementById('blockSalaGroup');
  const horarioGroup = document.getElementById('blockHorarioGroup');
  if (val === 'dia_inteiro') {
    if (salaGroup) salaGroup.style.display = 'none';
    if (horarioGroup) horarioGroup.style.display = 'none';
  } else if (val === 'horario_especifico') {
    if (salaGroup) salaGroup.style.display = 'none';
    if (horarioGroup) horarioGroup.style.display = 'block';
  } else {
    if (salaGroup) salaGroup.style.display = 'block';
    if (horarioGroup) horarioGroup.style.display = 'block';
  }
};

window.handleSalvarBloqueio = async (e) => {
  e.preventDefault();
  const data = document.getElementById('blockData')?.value;
  const tipo = document.getElementById('blockTipo')?.value;
  const sala = document.getElementById('blockSala')?.value || 'todas';
  const horario = document.getElementById('blockHorario')?.value || '';
  const motivo = document.getElementById('blockMotivo')?.value;

  if (!data || !motivo) {
    alert('Por favor, informe a data e o motivo do bloqueio.');
    return;
  }

  try {
    const btn = document.getElementById('btnSalvarBloqueio');
    if (btn) btn.disabled = true;

    const payload = {
      data,
      tipo,
      sala: tipo === 'dia_inteiro' ? 'todas' : sala,
      horario: tipo === 'dia_inteiro' ? 'Dia Inteiro' : horario,
      motivo,
      criadoEm: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'bloqueios'), payload);
    state.bloqueios.push({ id: docRef.id, ...payload });

    showToast('Data bloqueada.', 'success');
    renderApp();
  } catch (err) {
    console.error('Erro ao salvar bloqueio:', err);
    showToast('Erro ao salvar bloqueio.', 'error');
  }
};

window.removerBloqueio = (id) => {
  showConfirmModal({
    title: 'Remover Bloqueio',
    message: 'Deseja realmente desbloquear esta data/horário?',
    confirmText: 'Remover',
    confirmBtnClass: 'btn-admin-danger',
    onConfirm: async () => {
      try {
        await deleteDoc(doc(db, 'bloqueios', id));
        state.bloqueios = state.bloqueios.filter(b => b.id !== id);
        showToast('Bloqueio removido com sucesso.', 'info');
        renderApp();
      } catch (err) {
        console.error('Erro ao remover bloqueio:', err);
        showToast('Erro ao remover bloqueio.', 'error');
      }
    }
  });
};

// 8.4 Ações de Salas
window.toggleAtivoSala = async (id, novoAtivo) => {
  try {
    await updateDoc(doc(db, 'salas', id), { ativo: novoAtivo });
    const s = state.salas.find(item => item.id === id);
    if (s) s.ativo = novoAtivo;
    showToast(`Sala ${novoAtivo ? 'ativada' : 'desativada'} com sucesso.`, 'info');
    renderApp();
  } catch (err) {
    console.error('Erro toggle sala:', err);
    showToast('Erro ao alterar status da sala.', 'error');
  }
};

window.openModalNovaSala = () => {
  const nome = prompt('Nome da Sala (ex: Sala Silver, Sala Gold):');
  if (!nome) return;
  const capacidade = parseInt(prompt('Capacidade máxima de pessoas:', '25'), 10) || 25;
  const precoTotal = parseFloat(prompt('Preço total de locação (R$):', '750')) || 750;
  const descricao = prompt('Descrição curta da sala:', 'Ambiente acústico de alta performance.') || '';

  const id = 'sala-' + nome.toLowerCase().replace(/\s+/g, '-');
  const payload = {
    id,
    nome,
    slug: id,
    capacidade,
    precoTotal,
    sinal: precoTotal / 2,
    restante: precoTotal / 2,
    descricao,
    imagem: '/assets/brand/hero-bg.webp',
    ativo: true,
    ordem: state.salas.length + 1
  };

  setDoc(doc(db, 'salas', id), payload).then(() => {
    state.salas.push(payload);
    showToast('Nova sala cadastrada com sucesso.', 'success');
    renderApp();
  }).catch(err => {
    console.error('Erro ao criar sala:', err);
    showToast('Erro ao cadastrar sala.', 'error');
  });
};

window.editarSala = (id) => {
  const s = state.salas.find(item => item.id === id);
  if (!s) return;

  const novoNome = prompt('Editar Nome da Sala:', s.nome);
  if (!novoNome) return;
  const novaCapacidade = parseInt(prompt('Editar Capacidade:', s.capacidade), 10) || s.capacidade;
  const novoPreco = parseFloat(prompt('Editar Preço Total (R$):', s.precoTotal)) || s.precoTotal;
  const novaDesc = prompt('Editar Descrição:', s.descricao) || s.descricao;

  updateDoc(doc(db, 'salas', id), {
    nome: novoNome,
    capacidade: novaCapacidade,
    precoTotal: novoPreco,
    sinal: novoPreco / 2,
    restante: novoPreco / 2,
    descricao: novaDesc
  }).then(() => {
    s.nome = novoNome;
    s.capacidade = novaCapacidade;
    s.precoTotal = novoPreco;
    s.descricao = novaDesc;
    showToast('Sala atualizada com sucesso.', 'success');
    renderApp();
  }).catch(err => {
    console.error('Erro ao editar sala:', err);
    showToast('Erro ao salvar alterações da sala.', 'error');
  });
};

// 8.5 Ações do Cardápio
window.openModalCategoria = () => {
  const nome = prompt('Nome da nova categoria (ex: Vinhos, Sobremesas):');
  if (!nome) return;

  const id = 'cat-' + Date.now();
  const payload = {
    id,
    nome,
    ordem: state.categorias.length + 1,
    ativo: true
  };

  setDoc(doc(db, 'categorias_cardapio', id), payload).then(() => {
    state.categorias.push(payload);
    showToast('Categoria adicionada.', 'success');
    renderApp();
  }).catch(err => {
    console.error('Erro categoria:', err);
    showToast('Erro ao criar categoria.', 'error');
  });
};

window.excluirCategoria = (id) => {
  showConfirmModal({
    title: 'Excluir Categoria',
    message: 'Deseja excluir esta categoria do cardápio?',
    confirmText: 'Excluir',
    confirmBtnClass: 'btn-admin-danger',
    onConfirm: async () => {
      try {
        await deleteDoc(doc(db, 'categorias_cardapio', id));
        state.categorias = state.categorias.filter(c => c.id !== id);
        showToast('Categoria excluída.', 'info');
        renderApp();
      } catch (err) {
        console.error('Erro excluir categoria:', err);
      }
    }
  });
};

window.openModalItemCardapio = () => {
  const nome = prompt('Nome do Item (ex: Picanha na Chapa, Caipirinha de Morango):');
  if (!nome) return;
  const desc = prompt('Descrição detalhada dos ingredientes:') || '';
  const preco = parseFloat(prompt('Preço (R$):', '35.00')) || 0;
  const categoria = prompt(`Categoria (${state.categorias.map(c => c.nome).join(', ')}):`, state.categorias[0]?.nome || 'Petiscos') || 'Geral';

  const payload = {
    nome,
    descricao: desc,
    preco,
    categoria,
    ativo: true,
    ordem: state.cardapio.length + 1,
    imagem: '',
    criadoEm: serverTimestamp()
  };

  addDoc(collection(db, 'cardapio'), payload).then(docRef => {
    state.cardapio.push({ id: docRef.id, ...payload });
    showToast('Cardápio atualizado.', 'success');
    renderApp();
  }).catch(err => {
    console.error('Erro item cardapio:', err);
    showToast('Erro ao adicionar item.', 'error');
  });
};

window.editarItemCardapio = (id) => {
  const it = state.cardapio.find(item => item.id === id);
  if (!it) return;

  const novoNome = prompt('Editar Nome:', it.nome) || it.nome;
  const novaDesc = prompt('Editar Descrição:', it.descricao) || it.descricao;
  const novoPreco = parseFloat(prompt('Editar Preço (R$):', it.preco)) || it.preco;

  updateDoc(doc(db, 'cardapio', id), {
    nome: novoNome,
    descricao: novaDesc,
    preco: novoPreco
  }).then(() => {
    it.nome = novoNome;
    it.descricao = novaDesc;
    it.preco = novoPreco;
    showToast('Cardápio atualizado.', 'success');
    renderApp();
  }).catch(err => {
    console.error('Erro editar item cardapio:', err);
  });
};

window.excluirItemCardapio = (id) => {
  showConfirmModal({
    title: 'Excluir Item do Cardápio',
    message: 'Deseja realmente remover este item do cardápio?',
    confirmText: 'Excluir',
    confirmBtnClass: 'btn-admin-danger',
    onConfirm: async () => {
      try {
        await deleteDoc(doc(db, 'cardapio', id));
        state.cardapio = state.cardapio.filter(it => it.id !== id);
        showToast('Cardápio atualizado.', 'info');
        renderApp();
      } catch (err) {
        console.error('Erro excluir item:', err);
      }
    }
  });
};

// 8.6 Ações de PDF
window.handleUploadPdf = async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('inputPdfCardapio');
  const file = fileInput?.files?.[0];

  if (!file) {
    alert('Por favor, selecione um arquivo PDF.');
    return;
  }

  if (file.type !== 'application/pdf') {
    alert('O arquivo selecionado deve ser exclusivamente um PDF.');
    return;
  }

  try {
    const progressEl = document.getElementById('pdfUploadProgress');
    const submitBtn = document.getElementById('btnUploadPdf');
    if (progressEl) progressEl.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;

    const storageRef = ref(storage, `cardapio/cardapio-oficial-${Date.now()}.pdf`);
    const snap = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snap.ref);

    // Salva URL no Firestore
    await updateDoc(doc(db, 'configuracoes', 'geral'), {
      pdfUrl: downloadUrl,
      pdfAtualizadoEm: serverTimestamp()
    });

    if (state.configuracoes) {
      state.configuracoes.pdfUrl = downloadUrl;
    }

    showToast('PDF do cardápio atualizado com sucesso.', 'success');
    renderApp();
  } catch (err) {
    console.error('Erro upload PDF:', err);
    showToast('Erro ao enviar PDF para o Firebase Storage.', 'error');
  }
};

// 8.7 Ações de Galeria
window.openModalGaleria = async (tipo) => {
  if (tipo === 'imagem') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const titulo = prompt('Título da Foto (ex: Drink Assinatura, Salão Principal):') || 'Foto Backstage';
      const tag = prompt('Tag/Categoria (ex: Drink, Salão, Palco):') || 'Ambiente';

      try {
        showToast('Enviando imagem ao Firebase Storage...', 'info');
        const storageRef = ref(storage, `galeria/imagens/${Date.now()}-${file.name}`);
        const snap = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snap.ref);

        const payload = {
          tipo: 'imagem',
          titulo,
          tag,
          url,
          ativo: true,
          ordem: state.galeria.length + 1,
          criadoEm: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'galeria'), payload);
        state.galeria.push({ id: docRef.id, ...payload });

        showToast('Imagem adicionada à galeria com sucesso.', 'success');
        renderApp();
      } catch (err) {
        console.error('Erro upload imagem:', err);
        showToast('Erro ao enviar imagem.', 'error');
      }
    };

    input.click();
  } else {
    const titulo = prompt('Título do Vídeo:');
    if (!titulo) return;
    const url = prompt('URL do Vídeo (YouTube, Instagram ou link direto):');
    if (!url) return;

    try {
      const payload = {
        tipo: 'video',
        titulo,
        url,
        ativo: true,
        ordem: state.galeria.length + 1,
        criadoEm: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'galeria'), payload);
      state.galeria.push({ id: docRef.id, ...payload });

      showToast('Vídeo cadastrado na galeria com sucesso.', 'success');
      renderApp();
    } catch (err) {
      console.error('Erro cadastrar video:', err);
      showToast('Erro ao cadastrar vídeo.', 'error');
    }
  }
};

window.excluirItemGaleria = (id, fileUrl) => {
  showConfirmModal({
    title: 'Excluir Item da Galeria',
    message: 'Deseja realmente remover esta mídia da galeria?',
    confirmText: 'Excluir',
    confirmBtnClass: 'btn-admin-danger',
    onConfirm: async () => {
      try {
        await deleteDoc(doc(db, 'galeria', id));
        state.galeria = state.galeria.filter(g => g.id !== id);

        // Tenta remover do Storage se for arquivo hospedado
        if (fileUrl && fileUrl.includes('firebasestorage')) {
          try {
            const fileRef = ref(storage, fileUrl);
            await deleteObject(fileRef);
          } catch(e) {}
        }

        showToast('Imagem excluída.', 'info');
        renderApp();
      } catch (err) {
        console.error('Erro excluir item galeria:', err);
      }
    }
  });
};

// 8.8 Ações de Configurações
window.handleSalvarConfiguracoes = async (e) => {
  e.preventDefault();
  const whatsapp = document.getElementById('confWpp')?.value?.trim();
  const instagram = document.getElementById('confInsta')?.value?.trim();
  const mapsUrl = document.getElementById('confMaps')?.value?.trim();
  const contatoEmail = document.getElementById('confEmail')?.value?.trim();
  const endereco = document.getElementById('confEndereco')?.value?.trim();

  const terca = document.getElementById('confHorarioTerca')?.value?.trim();
  const quarta = document.getElementById('confHorarioQuarta')?.value?.trim();
  const quinta = document.getElementById('confHorarioQuinta')?.value?.trim();
  const sexta = document.getElementById('confHorarioSexta')?.value?.trim();
  const sabado = document.getElementById('confHorarioSabado')?.value?.trim();

  try {
    const btn = document.getElementById('btnSalvarConfig');
    if (btn) btn.disabled = true;

    const payload = {
      whatsapp,
      instagram,
      mapsUrl,
      contatoEmail,
      endereco,
      horarios: {
        terca,
        quarta,
        quinta,
        sexta,
        sabado,
        domingo: 'FECHADO',
        segunda: 'FECHADO'
      },
      atualizadoEm: serverTimestamp()
    };

    await setDoc(doc(db, 'configuracoes', 'geral'), payload, { merge: true });
    state.configuracoes = { ...state.configuracoes, ...payload };

    showToast('Configurações salvas com sucesso.', 'success');
    renderApp();
  } catch (err) {
    console.error('Erro ao salvar configs:', err);
    showToast('Erro ao salvar configurações no Firestore.', 'error');
  }
};

// ============================================================================
// 9. FUNÇÕES UTILITÁRIAS
// ============================================================================
function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateBR(isoStr) {
  if (!isoStr) return '-';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
}

function formatDisplayDate(d) {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function matchesDate(dateStr, targetDate) {
  if (!dateStr || !targetDate) return false;
  const iso = formatDateISO(targetDate);
  const br = formatDateBR(iso);
  const dayNum = String(targetDate.getDate()).padStart(2, '0');
  return dateStr.includes(iso) || dateStr.includes(br) || dateStr.includes(` ${dayNum}/`);
}

function formatTimestamp(ts) {
  if (!ts) return 'Recente';
  if (ts.toDate) {
    const d = ts.toDate();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (typeof ts === 'string') {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
  return 'Recente';
}
