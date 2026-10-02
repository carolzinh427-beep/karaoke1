import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

/**
 * Salva agendamento na coleção 'agendamentos' do Firestore para futura gestão no painel de administração
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
    const docRef = await addDoc(collection(db, 'agendamentos'), {
      ...dados,
      status: 'pendente',
      origem: 'site_cliente',
      criadoEm: serverTimestamp(),
    });
    console.log('Agendamento salvo no Firestore com ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.warn('Aviso: Firestore offline ou regras pendentes. Prosseguindo com envio via WhatsApp:', error);
    return { success: false, error };
  }
}
