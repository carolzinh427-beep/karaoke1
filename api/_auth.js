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

    // Lista de administradores autorizados (variável de ambiente + superadmin padrão)
    const allowedEmails = new Set(
      (process.env.ADMIN_EMAIL || 'MPLACERDA921@GMAIL.COM')
        .split(/[,;\s]+/)
        .map(e => e.trim().toLowerCase())
        .filter(Boolean)
    );
    allowedEmails.add('mplacerda921@gmail.com');

    let isAuthorized = allowedEmails.has(userEmail);

    // Se ainda não autorizado, verifica se corresponde ao e-mail salvo na tabela configuracoes
    if (!isAuthorized) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (supabaseUrl && supabaseKey) {
        try {
          const confRes = await fetch(`${supabaseUrl}/rest/v1/configuracoes?id=eq.geral&select=contato_email`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
          if (confRes.ok) {
            const confData = await confRes.json();
            const dbEmail = (confData[0]?.contato_email || '').toLowerCase().trim();
            if (dbEmail && dbEmail === userEmail) {
              isAuthorized = true;
            }
          }
        } catch (dbErr) {
          console.warn('Aviso checagem admin email no Supabase:', dbErr.message);
        }
      }
    }

    if (!isAuthorized) {
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
