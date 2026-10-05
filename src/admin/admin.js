/**
 * BACKSTAGE KARAOKÊ - PAINEL ADMINISTRATIVO COMPLETO
 * Arquitetura SPA moderna integrada com Firebase Auth, Firestore e Firebase Storage.
 */

import { auth, db } from '../lib/firebase.js';
import {
  DEFAULT_SALAS,
  DEFAULT_CATEGORIAS,
  DEFAULT_CARDAPIO,
  DEFAULT_CONFIGURACOES,
  seedDatabaseIfNeeded,
} from '../lib/catalogData.js';
import {
  isSupabaseConfigured,
  getSalasSupabase,
  saveSalaSupabase,
  getCategoriasSupabase,
  getCardapioSupabase,
  saveCardapioItemSupabase,
  deleteCardapioItemSupabase,
  getGaleriaSupabase,
  saveGaleriaItemSupabase,
  deleteGaleriaItemSupabase,
  getReservasSupabase,
  updateReservaStatusSupabase,
  deleteReservaSupabase,
  getBloqueiosSupabase,
  saveBloqueioSupabase,
  deleteBloqueioSupabase,
  getConfiguracoesSupabase,
  saveConfiguracoesSupabase
} from '../lib/supabase.js';
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
  uploadToCloudinary,
  deleteFromCloudinary,
  validateMediaFile,
  LIMITS,
} from '../lib/cloudinary.js';

// ============================================================================
// 1. ESTADO GLOBAL E ROTEAMENTO
// ============================================================================
const state = {
  user: null,
  currentRoute: '/admin',
  reservas: [],
  bloqueios: [],
  salas: [...DEFAULT_SALAS],
  cardapio: [...DEFAULT_CARDAPIO],
  categorias: [...DEFAULT_CATEGORIAS],
  activeFilterCardapio: 'todas',
  searchTermCardapio: '',
  cardapioPage: 1,
  cardapioPageSize: 12,
  galeria: [],
  activeFilterGaleria: 'todas',
  configuracoes: { ...DEFAULT_CONFIGURACOES },
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
    // Garante que o banco de dados esteja povoado com catálogo completo
    try {
      await seedDatabaseIfNeeded(db);
    } catch(seedErr) {
      console.warn('Seed inicial resiliente:', seedErr);
    }

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

// 5.1 Reservas (lê do Supabase e sincroniza com Firestore)
async function fetchReservas() {
  if (isSupabaseConfigured) {
    try {
      const data = await getReservasSupabase();
      if (data) {
        state.reservas = data;
        return state.reservas;
      }
    } catch (supaErr) {
      console.warn('Aviso Supabase reservas, tentando Firestore:', supaErr);
    }
  }

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
  if (isSupabaseConfigured) {
    try {
      const data = await getBloqueiosSupabase();
      if (data) {
        state.bloqueios = data;
        return state.bloqueios;
      }
    } catch (supaErr) {
      console.warn('Aviso Supabase bloqueios, tentando Firestore:', supaErr);
    }
  }

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
  if (isSupabaseConfigured) {
    try {
      const data = await getSalasSupabase();
      if (data && data.length > 0) {
        state.salas = data;
        return state.salas;
      }
    } catch (supaErr) {
      console.warn('Aviso Supabase salas, tentando Firestore:', supaErr);
    }
  }

  try {
    const snap = await getDocs(collection(db, 'salas'));
    if (snap.empty) {
      await seedDatabaseIfNeeded(db);
      const reSnap = await getDocs(collection(db, 'salas'));
      if (!reSnap.empty) {
        state.salas = reSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        return state.salas;
      }
      state.salas = [...DEFAULT_SALAS];
      return state.salas;
    }
    state.salas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return state.salas;
  } catch (err) {
    console.warn('Erro ao carregar salas:', err);
    state.salas = [...DEFAULT_SALAS];
    return state.salas;
  }
}

// 5.4 Cardápio e Categorias
async function fetchCategorias() {
  if (isSupabaseConfigured) {
    try {
      const data = await getCategoriasSupabase();
      if (data && data.length > 0) {
        state.categorias = data;
        return state.categorias;
      }
    } catch (supaErr) {
      console.warn('Aviso Supabase categorias, tentando Firestore:', supaErr);
    }
  }

  try {
    const snap = await getDocs(collection(db, 'categorias_cardapio'));
    if (snap.empty) {
      await seedDatabaseIfNeeded(db);
      const reSnap = await getDocs(collection(db, 'categorias_cardapio'));
      if (!reSnap.empty) {
        state.categorias = reSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        return state.categorias;
      }
      state.categorias = [...DEFAULT_CATEGORIAS];
      return state.categorias;
    }
    state.categorias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return state.categorias;
  } catch (err) {
    console.warn('Erro ao carregar categorias:', err);
    state.categorias = [...DEFAULT_CATEGORIAS];
    return state.categorias;
  }
}

async function fetchCardapio() {
  if (isSupabaseConfigured) {
    try {
      const data = await getCardapioSupabase();
      if (data && data.length > 0) {
        state.cardapio = data;
        return state.cardapio;
      }
    } catch (supaErr) {
      console.warn('Aviso Supabase cardápio, tentando Firestore:', supaErr);
    }
  }

  try {
    const snap = await getDocs(collection(db, 'cardapio'));
    if (snap.empty || snap.docs.length < 5) {
      await seedDatabaseIfNeeded(db);
      const reSnap = await getDocs(collection(db, 'cardapio'));
      if (!reSnap.empty) {
        state.cardapio = reSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        return state.cardapio;
      }
      state.cardapio = [...DEFAULT_CARDAPIO];
      return state.cardapio;
    }
    state.cardapio = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return state.cardapio;
  } catch (err) {
    console.warn('Erro ao carregar cardápio:', err);
    state.cardapio = [...DEFAULT_CARDAPIO];
    return state.cardapio;
  }
}

// 5.5 Galeria
async function fetchGaleria() {
  if (isSupabaseConfigured) {
    try {
      const data = await getGaleriaSupabase();
      if (data) {
        state.galeria = data;
        return state.galeria;
      }
    } catch (supaErr) {
      console.warn('Aviso Supabase galeria, tentando Firestore:', supaErr);
    }
  }

  try {
    const snap = await getDocs(collection(db, 'galeria'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));
    state.galeria = list;
    return state.galeria;
  } catch (err) {
    console.warn('Erro ao carregar galeria:', err);
    return [];
  }
}

// 5.6 Configurações
async function fetchConfiguracoes() {
  if (isSupabaseConfigured) {
    try {
      const data = await getConfiguracoesSupabase();
      if (data) {
        state.configuracoes = data;
        return state.configuracoes;
      }
    } catch (supaErr) {
      console.warn('Aviso Supabase configurações, tentando Firestore:', supaErr);
    }
  }

  try {
    const docRef = doc(db, 'configuracoes', 'geral');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      state.configuracoes = docSnap.data();
    } else {
      await seedDatabaseIfNeeded(db);
      state.configuracoes = { ...DEFAULT_CONFIGURACOES };
    }
    return state.configuracoes;
  } catch (err) {
    console.warn('Erro ao carregar configurações:', err);
    state.configuracoes = { ...DEFAULT_CONFIGURACOES };
    return state.configuracoes;
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
      ${state.salas.map(s => {
        const midiasSala = state.galeria.filter(g => g.sala === s.id || (s.id === 'sala-red' && (g.sala === 'sala-1' || (g.tag||'').toLowerCase().includes('red'))) || (s.id === 'sala-green' && (g.sala === 'sala-2' || (g.tag||'').toLowerCase().includes('green'))) || (s.id === 'sala-blue' && (g.sala === 'sala-3' || (g.tag||'').toLowerCase().includes('blue'))));
        const numFotos = midiasSala.filter(g => g.tipo !== 'video').length;
        const numVideos = midiasSala.filter(g => g.tipo === 'video').length;
        return `
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
            <div style="font-size: 0.78rem; color: var(--admin-text-muted); margin: 6px 0 10px 0; display: flex; align-items: center; gap: 8px;">
              <span>Mídias vinculadas:</span>
              <strong style="color: #FFFFFF;">${numFotos} fotos</strong> • <strong style="color: #FFFFFF;">${numVideos} vídeos</strong>
            </div>

            <div class="admin-item-footer">
              <button type="button" class="btn-admin btn-admin-primary btn-admin-xs" onclick="window.openMediaUploadModal('${s.id}')">
                + Upload Mídia
              </button>
              <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" onclick="window.editarSala('${s.id}')">
                Editar Sala
              </button>
              <button type="button" class="btn-admin btn-admin-xs ${s.ativo ? 'btn-admin-danger' : 'btn-admin-success'}" onclick="window.toggleAtivoSala('${s.id}', ${!s.ativo})">
                ${s.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        </div>
      `;
      }).join('')}
    </div>
  `;
}

// 7.6 Cardápio
function getFilteredCardapioItems() {
  const currentCat = state.activeFilterCardapio || 'todas';
  const searchTerm = (state.searchTermCardapio || '').toLowerCase().trim();

  let items = state.cardapio || [];
  if (currentCat !== 'todas') {
    items = items.filter(it => it.categoriaId === currentCat || (it.categoria || '').toLowerCase().includes(currentCat));
  }
  if (searchTerm) {
    items = items.filter(it => 
      (it.nome || '').toLowerCase().includes(searchTerm) || 
      (it.descricao || '').toLowerCase().includes(searchTerm) ||
      (it.categoria || '').toLowerCase().includes(searchTerm)
    );
  }
  return items;
}

function renderCardapioPagination(totalItems, currentPage, totalPages, fromItem, toItem) {
  if (totalPages <= 1) {
    return `
      <div class="cardapio-pagination-bar">
        <span class="cardapio-page-info">Total: <strong>${totalItems}</strong> ${totalItems === 1 ? 'item' : 'itens'}</span>
      </div>
    `;
  }

  let pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return `
    <div class="cardapio-pagination-bar">
      <div class="cardapio-page-info">
        Mostrando <strong>${fromItem}–${toItem}</strong> de <strong>${totalItems}</strong> itens (Pág. ${currentPage}/${totalPages})
      </div>
      <div class="cardapio-page-nav">
        <button type="button" 
                class="btn-admin btn-admin-outline btn-admin-xs page-nav-btn" 
                ${currentPage <= 1 ? 'disabled style="opacity: 0.35; cursor: not-allowed;"' : ''} 
                onclick="window.changeCardapioPage(${currentPage - 1})">
          ← Anterior
        </button>
        <div class="cardapio-page-pills">
          ${pages.map(p => {
            if (p === '...') {
              return `<span class="page-ellipsis">…</span>`;
            }
            return `
              <button type="button" 
                      class="page-num-pill ${p === currentPage ? 'active' : ''}" 
                      onclick="window.changeCardapioPage(${p})">
                ${p}
              </button>
            `;
          }).join('')}
        </div>
        <button type="button" 
                class="btn-admin btn-admin-outline btn-admin-xs page-nav-btn" 
                ${currentPage >= totalPages ? 'disabled style="opacity: 0.35; cursor: not-allowed;"' : ''} 
                onclick="window.changeCardapioPage(${currentPage + 1})">
          Próxima →
        </button>
      </div>
    </div>
  `;
}

function renderCardapioTableRows(filteredItems) {
  const page = state.cardapioPage || 1;
  const pageSize = state.cardapioPageSize || 12;
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  state.cardapioPage = currentPage;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageItems = filteredItems.slice(startIndex, endIndex);

  if (totalItems === 0) {
    return `
      <div class="empty-state" style="padding: 40px 20px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>
        <div class="empty-state-title">Nenhum item encontrado</div>
        <p class="empty-state-desc">Nenhum prato ou bebida corresponde aos filtros aplicados.</p>
        ${state.searchTermCardapio ? `
          <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" style="margin-top: 14px;" onclick="window.clearSearchCardapio()">
            Limpar Busca
          </button>
        ` : ''}
      </div>
    `;
  }

  return `
    <div class="table-responsive">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Item / Descrição</th>
            <th>Categoria</th>
            <th>Preço Oficial</th>
            <th>Disponibilidade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${pageItems.map(it => `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                  ${it.imagem ? `<img src="${it.imagem}" alt="${it.nome}" style="width: 42px; height: 42px; border-radius: 6px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--admin-border);">` : ''}
                  <div style="min-width: 0;">
                    <strong style="color: #FFFFFF; font-size: 0.92rem; display: block; word-break: break-word;">${it.nome}</strong>
                    <div style="font-size: 0.78rem; color: var(--admin-text-muted); margin-top: 2px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${it.descricao || ''}</div>
                  </div>
                </div>
              </td>
              <td>
                <span style="font-size: 0.8rem; background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; color: var(--admin-cyan); white-space: nowrap;">
                  ${it.categoria || it.categoriaId || '-'}
                </span>
              </td>
              <td>
                <strong style="color: var(--admin-cyan); font-size: 0.95rem; white-space: nowrap;">
                  R$ ${(it.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </td>
              <td>
                <span class="badge-status ${it.ativo !== false ? 'confirmed' : 'cancelled'}" style="white-space: nowrap;">
                  ${it.ativo !== false ? 'Ativo no Site' : 'Pausado'}
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: nowrap;">
                  <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" onclick="window.editarItemCardapio('${it.id}')" title="Editar item">
                    Editar
                  </button>
                  <button type="button" class="btn-admin btn-admin-xs ${it.ativo !== false ? 'btn-admin-danger' : 'btn-admin-success'}" onclick="window.toggleAtivoItemCardapio('${it.id}', ${it.ativo === false})" title="${it.ativo !== false ? 'Pausar item no site' : 'Reativar item'}">
                    ${it.ativo !== false ? 'Pausar' : 'Ativar'}
                  </button>
                  <button type="button" class="btn-admin btn-admin-danger btn-admin-xs" onclick="window.excluirItemCardapio('${it.id}')" title="Excluir item permanentemente">
                    &times;
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${renderCardapioPagination(totalItems, currentPage, totalPages, startIndex + 1, endIndex)}
  `;
}

function updateCardapioItemsOnly() {
  const container = document.getElementById('cardapioTableContainer');
  const countBadge = document.getElementById('cardapioCountBadge');
  const clearBtn = document.getElementById('cardapioSearchClearBtn');
  const filtered = getFilteredCardapioItems();

  if (countBadge) {
    countBadge.innerHTML = `Exibindo <strong style="color: var(--admin-cyan);">${filtered.length}</strong> de <strong style="color: #FFF;">${state.cardapio.length}</strong> itens cadastrados`;
  }
  if (clearBtn) {
    clearBtn.style.display = (state.searchTermCardapio && state.searchTermCardapio.length > 0) ? 'flex' : 'none';
  }
  if (container) {
    container.innerHTML = renderCardapioTableRows(filtered);
  }
}

function renderCardapioView() {
  const currentCat = state.activeFilterCardapio || 'todas';
  const items = getFilteredCardapioItems();

  return `
    <div class="view-header">
      <div class="view-headline">
        <h2>Gerenciamento do Cardápio</h2>
        <p>Edite pratos, porções, drinks, combos e organize as categorias do bar</p>
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

    <!-- Barra de Filtros e Busca Rápida Otimizada -->
    <div class="admin-card cardapio-controls-card">
      <div class="cardapio-search-row">
        <!-- Campo de Busca Otimizado para Mobile e Desktop -->
        <div class="cardapio-search-box-wrap">
          <svg class="cardapio-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" 
                 id="inputSearchCardapio"
                 class="cardapio-search-input" 
                 placeholder="Buscar prato, drink ou porção..." 
                 value="${state.searchTermCardapio || ''}" 
                 oninput="window.handleSearchCardapio(event)"
                 autocomplete="off"
                 spellcheck="false">
          <button type="button" 
                  id="cardapioSearchClearBtn" 
                  class="cardapio-search-clear-btn" 
                  onclick="window.clearSearchCardapio()" 
                  title="Limpar pesquisa"
                  style="display: ${state.searchTermCardapio ? 'flex' : 'none'};">
            &times;
          </button>
        </div>

        <!-- Totalizadores -->
        <div id="cardapioCountBadge" class="cardapio-count-badge">
          Exibindo <strong style="color: var(--admin-cyan);">${items.length}</strong> de <strong style="color: #FFF;">${state.cardapio.length}</strong> itens cadastrados
        </div>
      </div>

      <!-- Abas de Categorias com Rolagem no Mobile -->
      <div class="cardapio-cat-pills-row">
        <button type="button" 
                class="btn-admin btn-admin-xs cat-pill-btn ${currentCat === 'todas' ? 'btn-admin-primary' : 'btn-admin-outline'}" 
                data-cat="todas"
                onclick="window.setCardapioFilter('todas')">
          Todas (${state.cardapio.length})
        </button>
        ${state.categorias.map(c => {
          const count = state.cardapio.filter(it => it.categoriaId === c.id || (it.categoria || '').toLowerCase().includes(c.id)).length;
          return `
            <button type="button" 
                    class="btn-admin btn-admin-xs cat-pill-btn ${currentCat === c.id ? 'btn-admin-primary' : 'btn-admin-outline'}" 
                    data-cat="${c.id}"
                    onclick="window.setCardapioFilter('${c.id}')">
              ${c.nome} (${count})
            </button>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Tabela de Itens com Paginação -->
    <div class="admin-card" id="cardapioTableCard">
      <div class="admin-card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h3 class="admin-card-title">Itens do Cardápio</h3>
        <button type="button" class="btn-admin btn-admin-primary btn-admin-xs" onclick="window.openModalItemCardapio()">
          + Adicionar Item
        </button>
      </div>

      <div id="cardapioTableContainer">
        ${renderCardapioTableRows(items)}
      </div>
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
        <p style="font-size: 0.85rem; color: var(--admin-text-muted); margin-bottom: 18px;">Selecione o arquivo em formato PDF (máximo 25MB). Ele será enviado com segurança ao Cloudinary.</p>

        <input type="file" id="inputPdfCardapio" accept="application/pdf" class="form-input" style="max-width: 380px; margin: 0 auto 16px auto;" required>

        <div id="pdfUploadProgress" style="display: none; max-width: 380px; margin: 0 auto 16px auto;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--admin-cyan); margin-bottom: 4px;">Enviando ao Cloudinary...</div>
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

// Helper para renderizar badge de sala
function getRoomBadge(sala) {
  if (sala === 'sala-red' || sala === 'sala-1') {
    return `<span class="badge-room red">Sala 1</span>`;
  } else if (sala === 'sala-green' || sala === 'sala-2') {
    return `<span class="badge-room green">Sala 2</span>`;
  } else if (sala === 'sala-blue' || sala === 'sala-3') {
    return `<span class="badge-room blue">Sala 3</span>`;
  }
  return `<span class="badge-room" style="background: rgba(0, 240, 255, 0.15); color: var(--admin-cyan);">Geral</span>`;
}

// 7.8 Galeria de Fotos e Vídeos (100% Upload Direto)
function renderGaleriaView() {
  const currentFilter = state.activeFilterGaleria || 'todas';
  let filtered = state.galeria;
  if (currentFilter !== 'todas') {
    filtered = filtered.filter(g => {
      if (g.sala === currentFilter) return true;
      if (currentFilter === 'sala-red' && (g.sala === 'sala-1' || (g.tag || '').toLowerCase().includes('red'))) return true;
      if (currentFilter === 'sala-green' && (g.sala === 'sala-2' || (g.tag || '').toLowerCase().includes('green'))) return true;
      if (currentFilter === 'sala-blue' && (g.sala === 'sala-3' || (g.tag || '').toLowerCase().includes('blue'))) return true;
      return false;
    });
  }

  const imagens = filtered.filter(g => g.tipo !== 'video');
  const videos = filtered.filter(g => g.tipo === 'video');

  const countTotal = state.galeria.length;
  const countRed = state.galeria.filter(g => g.sala === 'sala-red' || g.sala === 'sala-1').length;
  const countGreen = state.galeria.filter(g => g.sala === 'sala-green' || g.sala === 'sala-2').length;
  const countBlue = state.galeria.filter(g => g.sala === 'sala-blue' || g.sala === 'sala-3').length;
  const countGeral = state.galeria.filter(g => !g.sala || g.sala === 'geral').length;

  return `
    <div class="view-header">
      <div class="view-headline">
        <h2>Galeria de Fotos e Vídeos</h2>
        <p>Gerencie o acervo visual das salas privadas e do espaço com upload direto de arquivos</p>
      </div>
      <div class="view-actions">
        <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" onclick="window.openMediaUploadModal(null, 'imagem')">
          + Upload de Foto
        </button>
        <button type="button" class="btn-admin btn-admin-magenta btn-admin-sm" onclick="window.openMediaUploadModal(null, 'video')">
          + Upload de Vídeo
        </button>
      </div>
    </div>

    <!-- Filtros de Salas da Galeria -->
    <div class="admin-card" style="margin-bottom: 24px; padding: 14px 20px;">
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <span style="font-size: 0.85rem; color: var(--admin-text-muted); margin-right: 8px; font-weight: 600;">Filtrar por Sala:</span>
        <button type="button" class="btn-admin btn-admin-xs ${currentFilter === 'todas' ? 'btn-admin-primary' : 'btn-admin-outline'}" onclick="window.setGaleriaFilter('todas')">
          Todas (${countTotal})
        </button>
        <button type="button" class="btn-admin btn-admin-xs ${currentFilter === 'sala-red' ? 'btn-admin-danger' : 'btn-admin-outline'}" onclick="window.setGaleriaFilter('sala-red')">
          Sala 1 - Red (${countRed})
        </button>
        <button type="button" class="btn-admin btn-admin-xs ${currentFilter === 'sala-green' ? 'btn-admin-success' : 'btn-admin-outline'}" onclick="window.setGaleriaFilter('sala-green')">
          Sala 2 - Green (${countGreen})
        </button>
        <button type="button" class="btn-admin btn-admin-xs ${currentFilter === 'sala-blue' ? 'btn-admin-cyan' : 'btn-admin-outline'}" onclick="window.setGaleriaFilter('sala-blue')">
          Sala 3 - Blue (${countBlue})
        </button>
        <button type="button" class="btn-admin btn-admin-xs ${currentFilter === 'geral' ? 'btn-admin-primary' : 'btn-admin-outline'}" onclick="window.setGaleriaFilter('geral')">
          Geral / Outros (${countGeral})
        </button>
      </div>
    </div>

    <!-- Seção de Vídeos (Upload Direto de Arquivo) -->
    <div class="admin-card" style="margin-bottom: 28px;">
      <div class="admin-card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h3 class="admin-card-title">Vídeos Enviados (${videos.length})</h3>
        <button type="button" class="btn-admin btn-admin-magenta btn-admin-xs" onclick="window.openMediaUploadModal(null, 'video')">
          + Enviar Novo Vídeo
        </button>
      </div>

      ${videos.length === 0 ? `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          <div class="empty-state-title">Nenhum vídeo nesta sala</div>
          <p class="empty-state-desc">Clique em <strong>+ Enviar Novo Vídeo</strong> para fazer o upload do arquivo MP4, WebM ou MOV.</p>
        </div>
      ` : `
        <div class="admin-items-grid">
          ${videos.map(vid => {
            const roomBadge = getRoomBadge(vid.sala);
            return `
              <div class="admin-item-card">
                <div style="background: #000; border-radius: 8px 8px 0 0; overflow: hidden; position: relative;">
                  <video controls playsinline preload="metadata" src="${vid.url}" style="width: 100%; height: 180px; object-fit: cover; display: block;"></video>
                </div>
                <div class="admin-item-body">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                    <h4 class="admin-item-title" style="margin: 0; font-size: 0.95rem; word-break: break-word;">${vid.titulo || 'Vídeo sem título'}</h4>
                    ${roomBadge}
                  </div>
                  <div style="font-size: 0.75rem; color: var(--admin-text-muted); margin-bottom: 8px; display: flex; flex-direction: column; gap: 2px;">
                    <div>${vid.tamanhoBytes ? `Tamanho: ${(vid.tamanhoBytes / (1024 * 1024)).toFixed(1)} MB` : ''} • ${vid.criadoEm?.toDate ? vid.criadoEm.toDate().toLocaleDateString('pt-BR') : 'Recente'}</div>
                    ${vid.publicId ? `<div style="color: var(--admin-cyan); font-family: monospace; font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${vid.publicId}">Cloudinary: ${vid.publicId}</div>` : ''}
                  </div>

                  <!-- Controles de Reordenação e Visibilidade -->
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; padding: 6px 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--admin-border); border-radius: 6px;">
                    <span class="badge-status ${vid.ativo !== false ? 'confirmed' : 'cancelled'}" style="cursor: pointer; margin: 0;" title="Toque para alternar visibilidade no site" onclick="window.toggleAtivoItemGaleria('${vid.id}', ${vid.ativo === false})">
                      ${vid.ativo !== false ? '✓ Ativo no Site' : 'Oculto'}
                    </span>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" style="padding: 2px 7px; font-weight: 800;" title="Mover para cima" onclick="window.reordenarItemGaleria('${vid.id}', -1)">↑</button>
                      <span style="font-size: 0.75rem; color: var(--admin-text-muted); font-weight: 700;">#${vid.ordem || 1}</span>
                      <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" style="padding: 2px 7px; font-weight: 800;" title="Mover para baixo" onclick="window.reordenarItemGaleria('${vid.id}', 1)">↓</button>
                    </div>
                  </div>

                  <div class="admin-item-footer" style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" onclick="window.editarItemGaleria('${vid.id}')">
                      Editar / Substituir
                    </button>
                    <button type="button" class="btn-admin btn-admin-danger btn-admin-xs" onclick="window.excluirItemGaleria('${vid.id}', '${vid.url}', '${vid.publicId || ''}', 'video')">
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <!-- Seção de Fotos (Upload Direto de Arquivo) -->
    <div class="admin-card">
      <div class="admin-card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h3 class="admin-card-title">Fotos Enviadas (${imagens.length})</h3>
        <button type="button" class="btn-admin btn-admin-primary btn-admin-xs" onclick="window.openMediaUploadModal(null, 'imagem')">
          + Enviar Nova Foto
        </button>
      </div>

      ${imagens.length === 0 ? `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <div class="empty-state-title">Nenhuma foto nesta sala</div>
          <p class="empty-state-desc">Clique em <strong>+ Enviar Nova Foto</strong> para fazer o upload de imagens da sala ou espaço.</p>
        </div>
      ` : `
        <div class="admin-items-grid">
          ${imagens.map(img => {
            const roomBadge = getRoomBadge(img.sala);
            return `
              <div class="admin-item-card">
                <img src="${img.url}" alt="${img.titulo}" class="admin-item-thumb" style="cursor: pointer; height: 180px; width: 100%; object-fit: cover;" onclick="window.open('${img.url}', '_blank')">
                <div class="admin-item-body">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                    <h4 class="admin-item-title" style="margin: 0; font-size: 0.95rem; word-break: break-word;">${img.titulo || 'Foto sem título'}</h4>
                    ${roomBadge}
                  </div>
                  <div style="font-size: 0.75rem; color: var(--admin-text-muted); margin-bottom: 8px; display: flex; flex-direction: column; gap: 2px;">
                    <div>${img.tamanhoBytes ? `Tamanho: ${(img.tamanhoBytes / 1024).toFixed(0)} KB` : ''} • ${img.criadoEm?.toDate ? img.criadoEm.toDate().toLocaleDateString('pt-BR') : 'Recente'}</div>
                    ${img.publicId ? `<div style="color: var(--admin-cyan); font-family: monospace; font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${img.publicId}">Cloudinary: ${img.publicId}</div>` : ''}
                  </div>

                  <!-- Controles de Reordenação e Visibilidade -->
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; padding: 6px 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--admin-border); border-radius: 6px;">
                    <span class="badge-status ${img.ativo !== false ? 'confirmed' : 'cancelled'}" style="cursor: pointer; margin: 0;" title="Toque para alternar visibilidade no site" onclick="window.toggleAtivoItemGaleria('${img.id}', ${img.ativo === false})">
                      ${img.ativo !== false ? '✓ Ativa no Site' : 'Oculta'}
                    </span>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" style="padding: 2px 7px; font-weight: 800;" title="Mover para cima" onclick="window.reordenarItemGaleria('${img.id}', -1)">↑</button>
                      <span style="font-size: 0.75rem; color: var(--admin-text-muted); font-weight: 700;">#${img.ordem || 1}</span>
                      <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" style="padding: 2px 7px; font-weight: 800;" title="Mover para baixo" onclick="window.reordenarItemGaleria('${img.id}', 1)">↓</button>
                    </div>
                  </div>

                  <div class="admin-item-footer" style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button type="button" class="btn-admin btn-admin-outline btn-admin-xs" onclick="window.editarItemGaleria('${img.id}')">
                      Editar / Substituir
                    </button>
                    <button type="button" class="btn-admin btn-admin-danger btn-admin-xs" onclick="window.excluirItemGaleria('${img.id}', '${img.url}', '${img.publicId || ''}', 'image')">
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
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
    if (isSupabaseConfigured) {
      try {
        await updateReservaStatusSupabase(id, 'CONFIRMED');
      } catch (supaErr) {
        console.warn('Aviso Supabase confirmar reserva:', supaErr);
      }
    }

    if (db) {
      try {
        const docRef = doc(db, 'reservas', id);
        await updateDoc(docRef, {
          status: 'CONFIRMED',
          confirmadoEm: serverTimestamp()
        });
      } catch(e) {}
    }

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
        if (isSupabaseConfigured) {
          try {
            await updateReservaStatusSupabase(id, 'CANCELLED');
          } catch (supaErr) {
            console.warn('Aviso Supabase cancelar reserva:', supaErr);
          }
        }

        if (db) {
          try {
            const docRef = doc(db, 'reservas', id);
            await updateDoc(docRef, {
              status: 'CANCELLED',
              canceladoEm: serverTimestamp()
            });
          } catch(e) {}
        }

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

    let blockId = null;
    if (isSupabaseConfigured) {
      try {
        const res = await saveBloqueioSupabase(payload);
        if (res?.id) blockId = res.id;
      } catch (supaErr) {
        console.warn('Aviso Supabase salvar bloqueio:', supaErr);
      }
    }

    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'bloqueios'), payload);
        if (!blockId) blockId = docRef.id;
      } catch(e) {}
    }

    state.bloqueios.push({ id: blockId || String(Date.now()), ...payload });

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
        if (isSupabaseConfigured) {
          try {
            await deleteBloqueioSupabase(id);
          } catch(supaErr) {
            console.warn('Aviso Supabase remover bloqueio:', supaErr);
          }
        }

        if (db) {
          try {
            await deleteDoc(doc(db, 'bloqueios', id));
          } catch(e) {}
        }

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
    const s = state.salas.find(item => item.id === id);
    if (isSupabaseConfigured && s) {
      try {
        await saveSalaSupabase({ ...s, ativo: novoAtivo });
      } catch (supaErr) {
        console.warn('Aviso Supabase toggle sala:', supaErr);
      }
    }

    if (db) {
      try {
        await updateDoc(doc(db, 'salas', id), { ativo: novoAtivo });
      } catch (e) {}
    }

    if (s) s.ativo = novoAtivo;
    showToast(`Sala ${novoAtivo ? 'ativada' : 'desativada'} com sucesso.`, 'info');
    renderApp();
  } catch (err) {
    console.error('Erro toggle sala:', err);
    showToast('Erro ao alterar status da sala.', 'error');
  }
};

// 8.4 Ações de Salas com Modal Profissional
window.openModalNovaSala = () => {
  const modal = document.getElementById('adminSalaModal');
  if (!modal) return;
  document.getElementById('salaModalTitle').textContent = 'Cadastrar Nova Sala';
  document.getElementById('modalSalaId').value = '';
  document.getElementById('modalSalaNome').value = '';
  document.getElementById('modalSalaCapacidade').value = '30';
  document.getElementById('modalSalaPrecoTotal').value = '800';
  document.getElementById('modalSalaDesc').value = '';
  document.getElementById('modalSalaAtiva').checked = true;
  const fotoInput = document.getElementById('modalSalaFoto');
  if (fotoInput) fotoInput.value = '';
  const fotoInfo = document.getElementById('modalSalaFotoInfo');
  if (fotoInfo) { fotoInfo.style.display = 'none'; fotoInfo.textContent = ''; }
  modal.classList.add('open');
};

window.editarSala = (id) => {
  const s = state.salas.find(item => item.id === id);
  if (!s) return;
  const modal = document.getElementById('adminSalaModal');
  if (!modal) return;
  document.getElementById('salaModalTitle').textContent = `Editar ${s.nome}`;
  document.getElementById('modalSalaId').value = s.id;
  document.getElementById('modalSalaNome').value = s.nome;
  document.getElementById('modalSalaCapacidade').value = s.capacidade || 30;
  document.getElementById('modalSalaPrecoTotal').value = s.precoTotal || 800;
  document.getElementById('modalSalaDesc').value = s.descricao || '';
  document.getElementById('modalSalaAtiva').checked = s.ativo !== false;
  const fotoInput = document.getElementById('modalSalaFoto');
  if (fotoInput) fotoInput.value = '';
  const fotoInfo = document.getElementById('modalSalaFotoInfo');
  if (fotoInfo) {
    if (s.imagem) {
      fotoInfo.style.display = 'block';
      fotoInfo.textContent = `Imagem atual configurada. Selecione outra foto para substituir.`;
    } else {
      fotoInfo.style.display = 'none';
      fotoInfo.textContent = '';
    }
  }
  modal.classList.add('open');
};

window.closeSalaModal = () => {
  const modal = document.getElementById('adminSalaModal');
  if (modal) modal.classList.remove('open');
};

window.saveSala = async (e) => {
  e.preventDefault();
  const id = document.getElementById('modalSalaId').value.trim();
  const nome = document.getElementById('modalSalaNome').value.trim();
  const capacidade = parseInt(document.getElementById('modalSalaCapacidade').value, 10) || 30;
  const precoTotal = parseFloat(document.getElementById('modalSalaPrecoTotal').value) || 0;
  const descricao = document.getElementById('modalSalaDesc').value.trim();
  const ativo = document.getElementById('modalSalaAtiva').checked;
  const fotoInput = document.getElementById('modalSalaFoto');
  const fotoFile = fotoInput?.files?.[0];

  const btn = document.getElementById('btnSalvarSala');
  if (btn) btn.disabled = true;

  try {
    const salaId = id || ('sala-' + nome.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    const payload = {
      id: salaId,
      nome,
      slug: salaId,
      capacidade,
      precoTotal,
      sinal: precoTotal / 2,
      restante: precoTotal / 2,
      descricao,
      ativo,
      atualizadoEm: serverTimestamp()
    };

    // Upload rápido e funcional da foto no Cloudinary se selecionada
    if (fotoFile) {
      const val = validateMediaFile(fotoFile, 'imagem');
      if (!val.ok) {
        alert(val.error);
        if (btn) btn.disabled = false;
        return;
      }
      if (btn) btn.textContent = 'Enviando foto ao Cloudinary...';
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const compressed = await compressImageIfNeeded(fotoFile, 1920, 0.82);
        const cRes = await uploadToCloudinary({ file: compressed, folder: 'backstage/salas', idToken });
        payload.imagem = cRes.url;
        payload.publicId = cRes.publicId;
      } catch (fotoErr) {
        console.warn('Aviso upload foto sala:', fotoErr);
        showToast('Falha no upload da sala para o Cloudinary: ' + fotoErr.message, 'error');
        if (btn) btn.disabled = false;
        return;
      }
    }

    if (isSupabaseConfigured) {
      try {
        await saveSalaSupabase(payload);
      } catch (supaErr) {
        console.warn('Aviso Supabase salvar sala:', supaErr);
      }
    }

    if (db) {
      try {
        await setDoc(doc(db, 'salas', salaId), payload, { merge: true });
      } catch(e) {}
    }

    const existingIdx = state.salas.findIndex(s => s.id === salaId);
    if (existingIdx >= 0) {
      state.salas[existingIdx] = { ...state.salas[existingIdx], ...payload };
    } else {
      if (!payload.imagem) payload.imagem = '/assets/brand/hero-bg.webp';
      payload.ordem = state.salas.length + 1;
      state.salas.push(payload);
    }

    showToast('Sala salva com sucesso no banco de dados.', 'success');
    window.closeSalaModal();
    renderApp();
  } catch (err) {
    console.error('Erro ao salvar sala:', err);
    showToast('Erro ao salvar sala: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Salvar Alterações';
    }
  }
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
  const modal = document.getElementById('adminCardapioItemModal');
  if (!modal) return;

  document.getElementById('cardapioModalTitle').textContent = 'Adicionar Item ao Cardápio';
  document.getElementById('modalItemId').value = '';
  document.getElementById('modalItemNome').value = '';
  document.getElementById('modalItemPreco').value = '';
  document.getElementById('modalItemDesc').value = '';
  document.getElementById('modalItemAtivo').checked = true;
  const fotoInput = document.getElementById('modalItemFoto');
  if (fotoInput) fotoInput.value = '';
  const fotoInfo = document.getElementById('modalItemFotoInfo');
  if (fotoInfo) { fotoInfo.style.display = 'none'; fotoInfo.textContent = ''; }

  const selectCat = document.getElementById('modalItemCategoria');
  if (selectCat) {
    selectCat.innerHTML = state.categorias.map(c => `
      <option value="${c.id}">${c.nome}</option>
    `).join('');
    if (state.activeFilterCardapio && state.activeFilterCardapio !== 'todas') {
      selectCat.value = state.activeFilterCardapio;
    }
  }

  modal.classList.add('open');
};

window.editarItemCardapio = (id) => {
  const it = state.cardapio.find(item => item.id === id);
  if (!it) return;

  const modal = document.getElementById('adminCardapioItemModal');
  if (!modal) return;

  document.getElementById('cardapioModalTitle').textContent = `Editar ${it.nome}`;
  document.getElementById('modalItemId').value = it.id;
  document.getElementById('modalItemNome').value = it.nome;
  document.getElementById('modalItemPreco').value = it.preco || '';
  document.getElementById('modalItemDesc').value = it.descricao || '';
  document.getElementById('modalItemAtivo').checked = it.ativo !== false;
  const fotoInput = document.getElementById('modalItemFoto');
  if (fotoInput) fotoInput.value = '';
  const fotoInfo = document.getElementById('modalItemFotoInfo');
  if (fotoInfo) {
    if (it.imagem) {
      fotoInfo.style.display = 'block';
      fotoInfo.textContent = 'Imagem atual configurada. Selecione outra foto para substituir.';
    } else {
      fotoInfo.style.display = 'none';
      fotoInfo.textContent = '';
    }
  }

  const selectCat = document.getElementById('modalItemCategoria');
  if (selectCat) {
    selectCat.innerHTML = state.categorias.map(c => `
      <option value="${c.id}" ${c.id === it.categoriaId || it.categoria === c.nome ? 'selected' : ''}>${c.nome}</option>
    `).join('');
  }

  modal.classList.add('open');
};

window.closeCardapioItemModal = () => {
  const modal = document.getElementById('adminCardapioItemModal');
  if (modal) modal.classList.remove('open');
};

window.saveCardapioItem = async (e) => {
  e.preventDefault();
  const id = document.getElementById('modalItemId').value.trim();
  const nome = document.getElementById('modalItemNome').value.trim();
  const preco = parseFloat(document.getElementById('modalItemPreco').value) || 0;
  const categoriaId = document.getElementById('modalItemCategoria').value;
  const catObj = state.categorias.find(c => c.id === categoriaId);
  const categoriaNome = catObj ? catObj.nome : categoriaId;
  const descricao = document.getElementById('modalItemDesc').value.trim();
  const ativo = document.getElementById('modalItemAtivo').checked;
  const fotoInput = document.getElementById('modalItemFoto');
  const fotoFile = fotoInput?.files?.[0];

  const btn = document.getElementById('btnSalvarItemCardapio');
  if (btn) btn.disabled = true;

  try {
    let fotoUrl = null;
    let fotoPublicId = null;
    if (fotoFile) {
      const val = validateMediaFile(fotoFile, 'imagem');
      if (!val.ok) {
        alert(val.error);
        if (btn) btn.disabled = false;
        return;
      }

      if (btn) btn.textContent = 'Enviando foto ao Cloudinary...';
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const compressed = await compressImageIfNeeded(fotoFile, 1280, 0.82);
        const cRes = await uploadToCloudinary({
          file: compressed,
          folder: 'backstage/cardapio',
          idToken
        });
        fotoUrl = cRes.url;
        fotoPublicId = cRes.publicId;
      } catch (fotoErr) {
        console.error('Erro upload foto cardápio:', fotoErr);
        showToast('Erro no upload da foto para Cloudinary: ' + fotoErr.message, 'error');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Salvar no Banco de Dados';
        }
        return;
      }
    }

    if (id) {
      // Edição de item existente
      const payload = {
        nome,
        preco,
        categoriaId,
        categoria: categoriaNome,
        descricao,
        ativo,
        atualizadoEm: serverTimestamp()
      };
      if (fotoUrl) {
        payload.imagem = fotoUrl;
        payload.imagemPublicId = fotoPublicId;
      }

      if (isSupabaseConfigured) {
        try {
          await saveCardapioItemSupabase({ id, ...payload });
        } catch (supaErr) {
          console.warn('Aviso Supabase atualizar item cardápio:', supaErr);
        }
      }

      if (db) {
        try {
          await updateDoc(doc(db, 'cardapio', id), payload);
        } catch(e) {}
      }

      const item = state.cardapio.find(it => it.id === id);
      if (item) Object.assign(item, payload);

      showToast(`Item "${nome}" atualizado no cardápio.`, 'success');
    } else {
      // Novo item criado
      const payload = {
        nome,
        preco,
        categoriaId,
        categoria: categoriaNome,
        descricao,
        ativo,
        ordem: state.cardapio.length + 1,
        imagem: fotoUrl || '',
        imagemPublicId: fotoPublicId || '',
        criadoEm: serverTimestamp()
      };

      let newItemId = null;
      if (isSupabaseConfigured) {
        try {
          const res = await saveCardapioItemSupabase(payload);
          if (res?.id) newItemId = res.id;
        } catch (supaErr) {
          console.warn('Aviso Supabase criar item cardápio:', supaErr);
        }
      }

      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'cardapio'), payload);
          if (!newItemId) newItemId = docRef.id;
        } catch(e) {}
      }

      state.cardapio.push({ id: newItemId || ('item-' + Date.now()), ...payload });

      showToast(`Item "${nome}" adicionado com sucesso.`, 'success');
    }

    window.closeCardapioItemModal();
    if (document.getElementById('cardapioTableContainer')) {
      updateCardapioItemsOnly();
    } else {
      renderApp();
    }
  } catch (err) {
    console.error('Erro ao salvar item do cardápio:', err);
    showToast('Erro ao salvar item: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Salvar no Banco de Dados';
    }
  }
};

window.setCardapioFilter = (catId) => {
  state.activeFilterCardapio = catId;
  state.cardapioPage = 1;
  // Atualiza classes ativas diretamente nos botões para resposta instantânea
  document.querySelectorAll('.cat-pill-btn').forEach(btn => {
    if (btn.dataset.cat === catId) {
      btn.classList.remove('btn-admin-outline');
      btn.classList.add('btn-admin-primary');
    } else {
      btn.classList.remove('btn-admin-primary');
      btn.classList.add('btn-admin-outline');
    }
  });
  updateCardapioItemsOnly();
};

window.handleSearchCardapio = (e) => {
  state.searchTermCardapio = e.target.value;
  state.cardapioPage = 1;
  // Atualiza exclusivamente a tabela sem destruir o DOM nem perder o foco
  updateCardapioItemsOnly();
};

window.clearSearchCardapio = () => {
  state.searchTermCardapio = '';
  state.cardapioPage = 1;
  const input = document.getElementById('inputSearchCardapio');
  if (input) {
    input.value = '';
    input.focus();
  }
  updateCardapioItemsOnly();
};

window.changeCardapioPage = (page) => {
  state.cardapioPage = page;
  updateCardapioItemsOnly();
  const card = document.getElementById('cardapioTableCard');
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

window.toggleAtivoItemCardapio = async (id, novoAtivo) => {
  try {
    const item = state.cardapio.find(it => it.id === id);
    if (isSupabaseConfigured && item) {
      try {
        await saveCardapioItemSupabase({ ...item, ativo: novoAtivo });
      } catch (supaErr) {
        console.warn('Aviso Supabase toggle item cardápio:', supaErr);
      }
    }

    if (db) {
      try {
        await updateDoc(doc(db, 'cardapio', id), { ativo: novoAtivo });
      } catch(e) {}
    }

    if (item) item.ativo = novoAtivo;
    showToast(novoAtivo ? 'Item reativado no cardápio.' : 'Item pausado no cardápio.', 'info');
    updateCardapioItemsOnly();
  } catch (err) {
    console.error('Erro ao alterar status do item:', err);
    showToast('Erro ao atualizar item: ' + err.message, 'error');
  }
};

window.excluirItemCardapio = (id) => {
  showConfirmModal({
    title: 'Excluir Item do Cardápio',
    message: 'Deseja realmente remover este item do cardápio permanentemente?',
    confirmText: 'Excluir',
    confirmBtnClass: 'btn-admin-danger',
    onConfirm: async () => {
      try {
        if (isSupabaseConfigured) {
          try {
            await deleteCardapioItemSupabase(id);
          } catch (supaErr) {
            console.warn('Aviso Supabase excluir item cardápio:', supaErr);
          }
        }

        if (db) {
          try {
            await deleteDoc(doc(db, 'cardapio', id));
          } catch(e) {}
        }

        state.cardapio = state.cardapio.filter(it => it.id !== id);
        showToast('Item excluído com sucesso.', 'info');
        updateCardapioItemsOnly();
      } catch (err) {
        console.error('Erro excluir item:', err);
        showToast('Erro ao excluir item: ' + err.message, 'error');
      }
    }
  });
};

// 8.6 Ações de PDF (Upload Direto no Cloudinary)
window.handleUploadPdf = async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('inputPdfCardapio');
  const file = fileInput?.files?.[0];

  if (!file) {
    alert('Por favor, selecione um arquivo PDF.');
    return;
  }

  const val = validateMediaFile(file, 'pdf');
  if (!val.ok) {
    alert(val.error);
    return;
  }

  const progressEl = document.getElementById('pdfUploadProgress');
  const submitBtn = document.getElementById('btnUploadPdf');

  try {
    if (progressEl) {
      progressEl.style.display = 'block';
      const textEl = progressEl.querySelector('div:first-child');
      if (textEl) textEl.textContent = 'Enviando PDF ao Cloudinary (0%)...';
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando PDF...';
    }

    const idToken = await auth.currentUser?.getIdToken();
    const cRes = await uploadToCloudinary({
      file,
      folder: 'backstage/documentos',
      idToken,
      onProgress: (percent) => {
        if (progressEl) {
          const textEl = progressEl.querySelector('div:first-child');
          if (textEl) textEl.textContent = `Enviando PDF ao Cloudinary (${percent}%)...`;
        }
      }
    });

    // Salva URL e metadados no Supabase e Firestore
    if (isSupabaseConfigured) {
      try {
        await saveConfiguracoesSupabase({
          ...state.configuracoes,
          pdfUrl: cRes.url,
          pdfPublicId: cRes.publicId
        });
      } catch (supaErr) {
        console.warn('Aviso Supabase salvar PDF em configuracoes:', supaErr);
      }
    }

    if (db) {
      try {
        await updateDoc(doc(db, 'configuracoes', 'geral'), {
          pdfUrl: cRes.url,
          pdfPublicId: cRes.publicId,
          pdfAtualizadoEm: serverTimestamp()
        });
      } catch(e) {}
    }

    if (state.configuracoes) {
      state.configuracoes.pdfUrl = cRes.url;
      state.configuracoes.pdfPublicId = cRes.publicId;
    }

    showToast('PDF do cardápio atualizado com sucesso no Cloudinary.', 'success');
    renderApp();
  } catch (err) {
    console.error('Erro upload PDF:', err);
    showToast('Erro ao enviar PDF: ' + err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Salvar e Atualizar PDF';
    }
    if (progressEl) progressEl.style.display = 'none';
  }
};

// 8.7 Ações de Galeria (100% Upload Direto Cloudinary)
let currentPreviewBlobUrl = null;

function clearMediaPreview() {
  if (currentPreviewBlobUrl) {
    URL.revokeObjectURL(currentPreviewBlobUrl);
    currentPreviewBlobUrl = null;
  }
  const previewBox = document.getElementById('uploadMediaPreviewBox');
  const imgWrap = document.getElementById('uploadMediaImgPreviewWrap');
  const vidWrap = document.getElementById('uploadMediaVidPreviewWrap');
  const imgEl = document.getElementById('uploadMediaImgPreview');
  const vidEl = document.getElementById('uploadMediaVidPreview');
  const infoEl = document.getElementById('uploadMediaFileInfo');

  if (previewBox) previewBox.style.display = 'none';
  if (imgWrap) imgWrap.style.display = 'none';
  if (vidWrap) vidWrap.style.display = 'none';
  if (imgEl) imgEl.src = '';
  if (vidEl) {
    vidEl.pause();
    vidEl.src = '';
  }
  if (infoEl) infoEl.textContent = '';
}

window.openMediaUploadModal = (preselectedRoom = null, preselectedType = null) => {
  const modal = document.getElementById('adminMediaUploadModal');
  if (!modal) return;

  clearMediaPreview();

  // Reset IDs
  const editIdInput = document.getElementById('uploadMediaEditId');
  if (editIdInput) editIdInput.value = '';
  const curPubInput = document.getElementById('uploadMediaCurrentPublicId');
  if (curPubInput) curPubInput.value = '';
  const curUrlInput = document.getElementById('uploadMediaCurrentUrl');
  if (curUrlInput) curUrlInput.value = '';

  const titleEl = document.getElementById('mediaUploadModalTitle');
  if (titleEl) titleEl.textContent = 'Upload de Mídia (Cloudinary)';

  const salaSelect = document.getElementById('uploadMediaSala');
  if (salaSelect) salaSelect.value = preselectedRoom || 'sala-red';

  const tituloInput = document.getElementById('uploadMediaTitulo');
  if (tituloInput) tituloInput.value = '';

  const fileInput = document.getElementById('uploadMediaFileInput');
  if (fileInput) {
    fileInput.value = '';
    fileInput.required = true;
  }

  const ordemInput = document.getElementById('uploadMediaOrdem');
  if (ordemInput) ordemInput.value = (state.galeria.length + 1).toString();

  const ativoInput = document.getElementById('uploadMediaAtivo');
  if (ativoInput) ativoInput.checked = true;

  window.handleMediaTypeChange(preselectedType || 'imagem');

  const progressWrap = document.getElementById('mediaUploadProgressWrap');
  if (progressWrap) progressWrap.style.display = 'none';

  const submitBtn = document.getElementById('btnSubmitMediaUpload');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Fazer Upload';
  }

  modal.classList.add('open');
};

window.editarItemGaleria = (id) => {
  const item = state.galeria.find(g => g.id === id);
  if (!item) return;

  const modal = document.getElementById('adminMediaUploadModal');
  if (!modal) return;

  clearMediaPreview();

  const editIdInput = document.getElementById('uploadMediaEditId');
  if (editIdInput) editIdInput.value = item.id;
  const curPubInput = document.getElementById('uploadMediaCurrentPublicId');
  if (curPubInput) curPubInput.value = item.publicId || '';
  const curUrlInput = document.getElementById('uploadMediaCurrentUrl');
  if (curUrlInput) curUrlInput.value = item.url || '';

  const titleEl = document.getElementById('mediaUploadModalTitle');
  if (titleEl) titleEl.textContent = 'Editar Mídia / Substituir Arquivo';

  const salaSelect = document.getElementById('uploadMediaSala');
  if (salaSelect) salaSelect.value = item.sala || 'sala-red';

  const tituloInput = document.getElementById('uploadMediaTitulo');
  if (tituloInput) tituloInput.value = item.titulo || '';

  const ordemInput = document.getElementById('uploadMediaOrdem');
  if (ordemInput) ordemInput.value = (item.ordem || 1).toString();

  const ativoInput = document.getElementById('uploadMediaAtivo');
  if (ativoInput) ativoInput.checked = item.ativo !== false;

  const fileInput = document.getElementById('uploadMediaFileInput');
  if (fileInput) {
    fileInput.value = '';
    fileInput.required = false; // Opcional ao editar
  }

  const isVideo = item.tipo === 'video';
  window.handleMediaTypeChange(isVideo ? 'video' : 'imagem');

  // Mostra prévia do arquivo atual já existente
  const previewBox = document.getElementById('uploadMediaPreviewBox');
  const previewLabel = document.getElementById('uploadMediaPreviewLabel');
  const imgWrap = document.getElementById('uploadMediaImgPreviewWrap');
  const vidWrap = document.getElementById('uploadMediaVidPreviewWrap');
  const imgEl = document.getElementById('uploadMediaImgPreview');
  const vidEl = document.getElementById('uploadMediaVidPreview');
  const infoEl = document.getElementById('uploadMediaFileInfo');

  if (previewBox) previewBox.style.display = 'block';
  if (previewLabel) previewLabel.textContent = 'Mídia Atual Cadastrada (Selecione um arquivo abaixo se desejar substituir):';

  if (isVideo) {
    if (vidWrap) vidWrap.style.display = 'block';
    if (vidEl) vidEl.src = item.url;
  } else {
    if (imgWrap) imgWrap.style.display = 'block';
    if (imgEl) imgEl.src = item.url;
  }

  if (infoEl) {
    infoEl.textContent = `Arquivo cadastrado: ${item.nomeArquivo || 'Mídia'} • ${item.publicId ? 'Cloudinary: ' + item.publicId : ''}`;
  }

  const progressWrap = document.getElementById('mediaUploadProgressWrap');
  if (progressWrap) progressWrap.style.display = 'none';

  const submitBtn = document.getElementById('btnSubmitMediaUpload');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar Alterações';
  }

  modal.classList.add('open');
};

window.closeMediaUploadModal = () => {
  const modal = document.getElementById('adminMediaUploadModal');
  if (modal) modal.classList.remove('open');
  clearMediaPreview();
};

window.openModalGaleria = (tipo) => {
  window.openMediaUploadModal(null, tipo);
};

window.handleMediaTypeChange = (tipo) => {
  const fileInput = document.getElementById('uploadMediaFileInput');
  const fileLabel = document.getElementById('uploadMediaFileLabel');
  const labelFoto = document.getElementById('labelTypeFoto');
  const labelVideo = document.getElementById('labelTypeVideo');
  const radioFoto = document.querySelector('input[name="mediaTypeRadio"][value="imagem"]');
  const radioVideo = document.querySelector('input[name="mediaTypeRadio"][value="video"]');

  if (tipo === 'video') {
    if (radioVideo) radioVideo.checked = true;
    if (fileInput) fileInput.accept = 'video/*,video/mp4,video/webm,video/quicktime';
    if (fileLabel) fileLabel.textContent = 'Arquivo de Vídeo (MP4, WebM, MOV - até 150MB)';
    if (labelVideo) {
      labelVideo.style.borderColor = 'var(--admin-magenta)';
      labelVideo.style.background = 'rgba(255, 0, 85, 0.12)';
    }
    if (labelFoto) {
      labelFoto.style.borderColor = 'var(--admin-border)';
      labelFoto.style.background = 'rgba(255, 255, 255, 0.03)';
    }
  } else {
    if (radioFoto) radioFoto.checked = true;
    if (fileInput) fileInput.accept = 'image/*,image/jpeg,image/png,image/webp';
    if (fileLabel) fileLabel.textContent = 'Arquivo de Imagem (JPG, PNG, WebP - até 20MB)';
    if (labelFoto) {
      labelFoto.style.borderColor = 'var(--admin-cyan)';
      labelFoto.style.background = 'rgba(0, 240, 255, 0.08)';
    }
    if (labelVideo) {
      labelVideo.style.borderColor = 'var(--admin-border)';
      labelVideo.style.background = 'rgba(255, 255, 255, 0.03)';
    }
  }
};

window.handleMediaFileSelected = (e) => {
  const file = e.target.files?.[0];
  const previewBox = document.getElementById('uploadMediaPreviewBox');
  const previewLabel = document.getElementById('uploadMediaPreviewLabel');
  const imgWrap = document.getElementById('uploadMediaImgPreviewWrap');
  const vidWrap = document.getElementById('uploadMediaVidPreviewWrap');
  const imgEl = document.getElementById('uploadMediaImgPreview');
  const vidEl = document.getElementById('uploadMediaVidPreview');
  const infoEl = document.getElementById('uploadMediaFileInfo');
  const radioTipo = document.querySelector('input[name="mediaTypeRadio"]:checked')?.value || 'imagem';

  if (!file) {
    return;
  }

  // Validação prévia
  const val = validateMediaFile(file, radioTipo);
  if (!val.ok) {
    alert(val.error);
    e.target.value = '';
    return;
  }

  // Revoga prévia anterior de blob
  if (currentPreviewBlobUrl) {
    URL.revokeObjectURL(currentPreviewBlobUrl);
    currentPreviewBlobUrl = null;
  }

  currentPreviewBlobUrl = URL.createObjectURL(file);
  const sizeMb = (file.size / (1024 * 1024)).toFixed(2);

  if (previewBox) previewBox.style.display = 'block';
  if (previewLabel) previewLabel.textContent = 'Novo Arquivo Selecionado (Prévia):';

  if (radioTipo === 'video' || file.type.startsWith('video/')) {
    if (imgWrap) imgWrap.style.display = 'none';
    if (vidWrap) vidWrap.style.display = 'block';
    if (vidEl) {
      vidEl.src = currentPreviewBlobUrl;
      vidEl.load();
    }
  } else {
    if (vidWrap) vidWrap.style.display = 'none';
    if (imgWrap) imgWrap.style.display = 'block';
    if (imgEl) imgEl.src = currentPreviewBlobUrl;
  }

  if (infoEl) {
    infoEl.textContent = `Arquivo: ${file.name} (${sizeMb} MB) • Tipo: ${file.type || 'Detectado'}`;
  }
};

window.toggleAtivoItemGaleria = async (id, novoAtivo) => {
  try {
    const item = state.galeria.find(g => g.id === id);
    if (isSupabaseConfigured && item) {
      try {
        await saveGaleriaItemSupabase({ ...item, ativo: novoAtivo });
      } catch (supaErr) {
        console.warn('Aviso Supabase toggle galeria:', supaErr);
      }
    }

    if (db) {
      try {
        await updateDoc(doc(db, 'galeria', id), {
          ativo: novoAtivo,
          atualizadoEm: serverTimestamp()
        });
      } catch(e) {}
    }

    if (item) item.ativo = novoAtivo;
    showToast(novoAtivo ? 'Mídia ativada na galeria pública.' : 'Mídia oculta na galeria pública.', 'info');
    renderApp();
  } catch (err) {
    console.error('Erro ao alterar status da mídia:', err);
    showToast('Erro ao atualizar mídia: ' + err.message, 'error');
  }
};

window.reordenarItemGaleria = async (id, direcao) => {
  const idx = state.galeria.findIndex(g => g.id === id);
  if (idx < 0) return;

  const targetIdx = idx + direcao;
  if (targetIdx < 0 || targetIdx >= state.galeria.length) return;

  const currentItem = state.galeria[idx];
  const targetItem = state.galeria[targetIdx];

  // Troca ordem
  const currentOrdem = currentItem.ordem || (idx + 1);
  const targetOrdem = targetItem.ordem || (targetIdx + 1);

  currentItem.ordem = targetOrdem;
  targetItem.ordem = currentOrdem;

  // Swap no array
  state.galeria[idx] = targetItem;
  state.galeria[targetIdx] = currentItem;

  renderApp();

  try {
    if (isSupabaseConfigured) {
      try {
        await Promise.all([
          saveGaleriaItemSupabase(currentItem),
          saveGaleriaItemSupabase(targetItem)
        ]);
      } catch (supaErr) {
        console.warn('Aviso Supabase reordenar galeria:', supaErr);
      }
    }

    if (db) {
      try {
        await Promise.all([
          updateDoc(doc(db, 'galeria', currentItem.id), { ordem: currentItem.ordem, atualizadoEm: serverTimestamp() }),
          updateDoc(doc(db, 'galeria', targetItem.id), { ordem: targetItem.ordem, atualizadoEm: serverTimestamp() })
        ]);
      } catch(e) {}
    }

    showToast('Ordem da galeria atualizada.', 'info');
  } catch (err) {
    console.error('Erro ao reordenar mídia:', err);
    showToast('Erro ao salvar nova ordem: ' + err.message, 'error');
  }
};

window.submitMediaUpload = async (e) => {
  e.preventDefault();
  const editId = document.getElementById('uploadMediaEditId')?.value?.trim();
  const currentPublicId = document.getElementById('uploadMediaCurrentPublicId')?.value?.trim();
  const currentUrl = document.getElementById('uploadMediaCurrentUrl')?.value?.trim();

  const sala = document.getElementById('uploadMediaSala')?.value || 'geral';
  const tipoRadio = document.querySelector('input[name="mediaTypeRadio"]:checked')?.value || 'imagem';
  const titulo = document.getElementById('uploadMediaTitulo')?.value?.trim() || 'Mídia Backstage';
  const ordem = parseInt(document.getElementById('uploadMediaOrdem')?.value, 10) || (state.galeria.length + 1);
  const ativo = document.getElementById('uploadMediaAtivo')?.checked !== false;

  const fileInput = document.getElementById('uploadMediaFileInput');
  const file = fileInput?.files?.[0];

  // Se não for edição, o arquivo é obrigatório
  if (!editId && !file) {
    alert('Por favor, selecione um arquivo para upload.');
    return;
  }

  const progressWrap = document.getElementById('mediaUploadProgressWrap');
  const progressBar = document.getElementById('mediaUploadProgressBar');
  const progressPercent = document.getElementById('mediaUploadProgressPercent');
  const progressText = document.getElementById('mediaUploadProgressText');
  const submitBtn = document.getElementById('btnSubmitMediaUpload');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processando...';
  }

  try {
    let finalUrl = currentUrl;
    let finalPublicId = currentPublicId;
    let finalTamanho = null;
    let finalNomeArquivo = null;
    let finalTipo = tipoRadio;
    let finalFormato = null;
    let finalLargura = null;
    let finalAltura = null;
    let finalDuracao = null;

    // Se um arquivo novo foi selecionado, faz upload seguro no Cloudinary
    if (file) {
      const val = validateMediaFile(file, tipoRadio);
      if (!val.ok) {
        alert(val.error);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = editId ? 'Salvar Alterações' : 'Fazer Upload';
        }
        return;
      }

      if (progressWrap) progressWrap.style.display = 'block';
      if (progressBar) progressBar.style.width = '0%';
      if (progressPercent) progressPercent.textContent = '0%';

      let fileToUpload = file;
      if (tipoRadio === 'imagem') {
        if (progressText) progressText.textContent = 'Otimizando imagem para envio rápido...';
        try {
          fileToUpload = await compressImageIfNeeded(file, 2048, 0.85);
        } catch (compErr) {
          console.warn('Compressão ignorada:', compErr);
        }
      }

      if (progressText) progressText.textContent = 'Enviando com segurança para a CDN do Cloudinary...';

      const idToken = await auth.currentUser?.getIdToken();
      const cRes = await uploadToCloudinary({
        file: fileToUpload,
        folder: 'backstage/galeria',
        idToken,
        onProgress: (percent) => {
          if (progressBar) progressBar.style.width = percent + '%';
          if (progressPercent) progressPercent.textContent = percent + '%';
          if (progressText) {
            progressText.textContent = tipoRadio === 'video'
              ? `Enviando vídeo ao Cloudinary (${percent}%)...`
              : `Enviando foto ao Cloudinary (${percent}%)...`;
          }
        }
      });

      finalUrl = cRes.url;
      finalPublicId = cRes.publicId;
      finalTamanho = cRes.bytes;
      finalNomeArquivo = file.name;
      finalTipo = cRes.resourceType === 'video' ? 'video' : 'imagem';
      finalFormato = cRes.format;
      finalLargura = cRes.width;
      finalAltura = cRes.height;
      finalDuracao = cRes.duration;

      // Se estiver substituindo um arquivo antigo com publicId no Cloudinary, exclui a mídia antiga do Cloudinary
      if (editId && currentPublicId && currentPublicId !== finalPublicId) {
        try {
          await deleteFromCloudinary({
            publicId: currentPublicId,
            resourceType: tipoRadio === 'video' ? 'video' : 'image',
            idToken
          });
        } catch (delOldErr) {
          console.warn('Aviso ao excluir mídia anterior no Cloudinary:', delOldErr);
        }
      }
    }

    if (editId) {
      // Atualiza item existente
      const payload = {
        sala,
        tipo: finalTipo,
        titulo,
        ordem,
        ativo,
        atualizadoEm: serverTimestamp()
      };
      if (file) {
        payload.url = finalUrl;
        payload.publicId = finalPublicId;
        payload.tamanhoBytes = finalTamanho;
        payload.nomeArquivo = finalNomeArquivo;
        if (finalFormato) payload.formato = finalFormato;
        if (finalLargura) payload.largura = finalLargura;
        if (finalAltura) payload.altura = finalAltura;
        if (finalDuracao) payload.duracao = finalDuracao;
      }

      if (isSupabaseConfigured) {
        try {
          await saveGaleriaItemSupabase({ id: editId, ...payload });
        } catch (supaErr) {
          console.warn('Aviso Supabase atualizar galeria:', supaErr);
        }
      }

      if (db) {
        try {
          await updateDoc(doc(db, 'galeria', editId), payload);
        } catch(e) {}
      }

      const item = state.galeria.find(g => g.id === editId);
      if (item) Object.assign(item, payload);

      showToast('Mídia atualizada com sucesso no banco de dados e Cloudinary!', 'success');
    } else {
      // Cria novo item
      const payload = {
        tipo: finalTipo,
        sala,
        titulo,
        url: finalUrl,
        publicId: finalPublicId,
        formato: finalFormato,
        largura: finalLargura,
        altura: finalAltura,
        duracao: finalDuracao || null,
        tamanhoBytes: finalTamanho || file.size,
        nomeArquivo: finalNomeArquivo || file.name,
        ativo,
        ordem,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      let newMediaId = null;
      if (isSupabaseConfigured) {
        try {
          const res = await saveGaleriaItemSupabase(payload);
          if (res?.id) newMediaId = res.id;
        } catch (supaErr) {
          console.warn('Aviso Supabase criar item galeria:', supaErr);
        }
      }

      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'galeria'), payload);
          if (!newMediaId) newMediaId = docRef.id;
        } catch(e) {}
      }

      state.galeria.unshift({ id: newMediaId || ('media-' + Date.now()), ...payload });

      showToast(finalTipo === 'video' ? 'Vídeo enviado com sucesso ao Cloudinary!' : 'Foto enviada com sucesso ao Cloudinary!', 'success');
    }

    window.closeMediaUploadModal();
    renderApp();
  } catch (err) {
    console.error('Erro no upload Cloudinary / Banco de Dados:', err);
    showToast('Falha no upload: ' + err.message, 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? 'Salvar Alterações' : 'Tentar Novamente';
    }
  }
};

window.excluirItemGaleria = (id, fileUrl, publicId, resourceType = 'image') => {
  showConfirmModal({
    title: 'Excluir Mídia Permanentemente',
    message: 'Deseja realmente remover esta mídia da galeria pública, do banco de dados e do Cloudinary?',
    confirmText: 'Excluir',
    confirmBtnClass: 'btn-admin-danger',
    onConfirm: async () => {
      try {
        // 1. Remove do Supabase se configurado
        if (isSupabaseConfigured) {
          try {
            await deleteGaleriaItemSupabase(id);
          } catch (supaErr) {
            console.warn('Aviso Supabase excluir mídia:', supaErr);
          }
        }

        // 2. Remove do Firestore
        if (db) {
          try {
            await deleteDoc(doc(db, 'galeria', id));
          } catch(e) {}
        }

        state.galeria = state.galeria.filter(g => g.id !== id);

        // 3. Remove do Cloudinary se possuir publicId
        if (publicId) {
          try {
            const idToken = await auth.currentUser?.getIdToken();
            await deleteFromCloudinary({
              publicId,
              resourceType: resourceType === 'video' ? 'video' : 'image',
              idToken
            });
          } catch (cloudErr) {
            console.warn('Aviso exclusão Cloudinary:', cloudErr);
          }
        }

        showToast('Mídia excluída com sucesso da galeria e do Cloudinary.', 'info');
        renderApp();
      } catch (err) {
        console.error('Erro ao excluir mídia:', err);
        showToast('Erro ao excluir mídia: ' + err.message, 'error');
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

    if (isSupabaseConfigured) {
      try {
        await saveConfiguracoesSupabase(payload);
      } catch (supaErr) {
        console.warn('Aviso Supabase salvar configurações:', supaErr);
      }
    }

    if (db) {
      try {
        await setDoc(doc(db, 'configuracoes', 'geral'), payload, { merge: true });
      } catch(e) {}
    }

    state.configuracoes = { ...state.configuracoes, ...payload };

    showToast('Configurações salvas com sucesso.', 'success');
    renderApp();
  } catch (err) {
    console.error('Erro ao salvar configs:', err);
    showToast('Erro ao salvar configurações no banco de dados.', 'error');
  } finally {
    if (btn) btn.disabled = false;
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
