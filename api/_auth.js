/**
 * Autenticação e autorização de Administrador via Firebase Authentication
 * Valida o Firebase ID Token diretamente nos servidores do Google Identity Toolkit.
 */

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAS6XWac_dB_hMI0M-ZaC5Qju2_zquYYcE';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'MPLACERDA921@GMAIL.COM').toLowerCase();

export async function verifyAdminToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  let token = '';

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.body && req.body.idToken) {
    token = req.body.idToken;
  } else if (req.query && req.query.idToken) {
    token = req.query.idToken;
  }

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Token de autenticação não fornecido no cabeçalho Authorization.'
    };
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idToken: token })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || 'Token do Firebase inválido ou expirado';
      return {
        ok: false,
        status: 401,
        error: `Autenticação inválida: ${errMsg}`
      };
    }

    const data = await res.json();
    const user = data.users?.[0];

    if (!user || !user.email) {
      return {
        ok: false,
        status: 401,
        error: 'Conta de usuário não localizada para o token fornecido.'
      };
    }

    const userEmail = user.email.toLowerCase().trim();
    if (userEmail !== ADMIN_EMAIL) {
      return {
        ok: false,
        status: 403,
        error: `Acesso negado: o usuário ${user.email} não possui privilégios de administrador do Backstage Karaokê.`
      };
    }

    return {
      ok: true,
      user: {
        uid: user.localId,
        email: user.email,
        displayName: user.displayName
      }
    };
  } catch (err) {
    console.error('Erro na validação do token Firebase:', err);
    return {
      ok: false,
      status: 500,
      error: 'Erro de comunicação ao validar credenciais com o Firebase: ' + err.message
    };
  }
}
