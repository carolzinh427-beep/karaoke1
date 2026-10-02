import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID,
};

// Inicialização segura do Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

/**
 * Salva agendamento nas coleções 'reservas' e 'agendamentos' do Firestore
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
  try {
    const payload = {
      ...dados,
      status: 'PENDING',
      origem: 'site_cliente',
      criadoEm: serverTimestamp(),
      dataCriacao: new Date().toISOString()
    };
    
    // Salva na coleção principal 'reservas'
    const docRef = await addDoc(collection(db, 'reservas'), payload);
    
    // Também sincroniza com 'agendamentos' para integridade legada
    try {
      await addDoc(collection(db, 'agendamentos'), { ...payload, idReserva: docRef.id });
    } catch(syncErr) {
      console.warn('Sync legada agendamentos:', syncErr);
    }
    
    console.log('Reserva registrada no Firestore com ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.warn('Aviso: Firestore offline ou regras pendentes. Prosseguindo com envio via WhatsApp:', error);
    return { success: false, error };
  }
}

