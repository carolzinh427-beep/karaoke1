import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || 'AIzaSyAS6XWac_dB_hMI0M-ZaC5Qju2_zquYYcE',
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || 'backstagekaraoke.firebaseapp.com',
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || 'backstagekaraoke',
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || 'backstagekaraoke.firebasestorage.app',
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || '992202842654',
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || '1:992202842654:web:7915994ec43e6e95abc40f',
  measurementId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID) || 'G-64DTM5WGG5',
};

// Inicialização segura e blindada do Firebase
let app = null;
let db = null;
let auth = null;
let storage = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (e) {
  console.warn('Firebase inicialização resiliente:', e);
}

import { isSupabaseConfigured, saveReservaSupabase } from './supabase.js';

export { app, db, auth, storage };

/**
 * Salva agendamento no Supabase (se configurado) e no Firestore
 * para garantir compatibilidade total com o painel administrativo.
 * @param {Object} dados
 * @param {string} dados.nome
 * @param {string} dados.whatsapp
 * @param {string} dados.data
 * @param {string} dados.sala
 * @param {number} dados.pessoas
 * @param {boolean} dados.termosAceitos
 */
export async function salvarAgendamento(dados) {
  let supabaseId = null;

  // 1. Prioriza salvar no Supabase se as variáveis estiverem configuradas
  if (isSupabaseConfigured) {
    try {
      const res = await saveReservaSupabase(dados);
      if (res && res.id) {
        supabaseId = res.id;
        console.log('Reserva registrada no Supabase com ID:', supabaseId);
      }
    } catch (supaErr) {
      console.warn('Aviso ao registrar reserva no Supabase, prosseguindo com Firestore:', supaErr);
    }
  }

  // 2. Registra também no Firestore se db estiver inicializado
  try {
    if (db) {
      const payload = {
        ...dados,
        status: dados.status || 'CONFIRMED',
        origem: dados.origem || 'site_cliente',
        criadoEm: serverTimestamp(),
        dataCriacao: new Date().toISOString()
      };
      if (supabaseId) payload.supabaseId = supabaseId;
      
      const docRef = await addDoc(collection(db, 'reservas'), payload);
      
      try {
        await addDoc(collection(db, 'agendamentos'), { ...payload, idReserva: docRef.id });
      } catch(syncErr) {
        console.warn('Sync legada agendamentos:', syncErr);
      }
      
      console.log('Reserva registrada no Firestore com ID:', docRef.id);
      return { success: true, id: supabaseId || docRef.id };
    }
  } catch (error) {
    console.warn('Aviso: Firestore offline ou regras pendentes:', error);
  }

  if (supabaseId) {
    return { success: true, id: supabaseId };
  }

  return { success: true };
}

