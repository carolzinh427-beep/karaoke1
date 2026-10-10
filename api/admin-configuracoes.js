/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — ENDPOINT DE CONFIGURAÇÕES ADMINISTRATIVAS (SERVERLESS)
 * ==============================================================================
 * Rota: GET, POST /api/admin-configuracoes
 * Segurança:
 * - GET: Retorna as configurações públicas/gerais do estabelecimento.
 * - POST: Restrito a administradores autorizados com Firebase ID Token válido.
 * Persistência: Supabase PostgreSQL (via Service Role Key ou chave anônima).
 * ==============================================================================
 */

import { verifyAdminToken } from './_auth.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://qepsqxllrgtrrtafpwpe.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  // ----------------------------------------------------------------------------
  // GET: Retorna as configurações atuais gravadas no banco de dados
  // ----------------------------------------------------------------------------
  if (req.method === 'GET') {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({
        sucesso: true,
        origem: 'padrao',
        configuracoes: {
          id: 'geral',
          whatsapp: '556181426321',
          instagram: '@backstagekaraoke',
          mapsUrl: 'https://maps.app.goo.gl/AwFhL4Z4Au6cqu4v6',
          contatoEmail: 'contato@barbackstagekaraoke.com.br',
          endereco: 'CLN 307, Bloco A, Subsolo - Asa Norte, Brasília - DF',
          pixChave: '',
          pixTipoChave: '',
          pixTitular: '',
          pixCopiaCola: '',
          pixQrcodeUrl: '',
          horarios: {}
        }
      });
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/configuracoes?id=eq.geral`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      if (response.ok) {
        const rows = await response.json();
        if (rows && rows.length > 0) {
          const row = rows[0];
          return res.status(200).json({
            sucesso: true,
            origem: 'supabase',
            configuracoes: {
              id: row.id,
              whatsapp: row.whatsapp,
              instagram: row.instagram,
              mapsUrl: row.maps_url,
              endereco: row.endereco,
              contatoEmail: row.contato_email || '',
              pdfUrl: row.pdf_url || '/cardapio-oficial.pdf',
              pdfPublicId: row.pdf_public_id || null,
              pixChave: row.pix_chave || '',
              pixTipoChave: row.pix_tipo_chave || '',
              pixTitular: row.pix_titular || '',
              pixCopiaCola: row.pix_copia_cola || '',
              pixQrcodeUrl: row.pix_qrcode_url || '',
              horarios: row.horarios || {},
              atualizadoEm: row.updated_at || row.created_at
            }
          });
        }
      }
      return res.status(200).json({ sucesso: true, configuracoes: null });
    } catch (err) {
      console.warn('Erro ao consultar configurações no Supabase:', err.message);
      return res.status(500).json({ sucesso: false, error: 'Erro ao consultar banco de dados: ' + err.message });
    }
  }

  // ----------------------------------------------------------------------------
  // POST: Atualização das configurações (Exclusivo para administradores)
  // ----------------------------------------------------------------------------
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize GET ou POST.' });
  }

  // 1. Validação obrigatória de credenciais de Administrador (Firebase ID Token)
  const authCheck = await verifyAdminToken(req);
  if (!authCheck.ok) {
    console.warn('[Admin Config] Tentativa não autorizada:', authCheck.error);
    return res.status(authCheck.status || 401).json({
      sucesso: false,
      error: authCheck.error || 'Acesso negado. Apenas administradores autorizados podem alterar as configurações.'
    });
  }

  const {
    whatsapp,
    instagram,
    mapsUrl,
    contatoEmail,
    endereco,
    horarios,
    pdfUrl,
    pdfPublicId,
    pixChave,
    pixTipoChave,
    pixTitular,
    pixCopiaCola,
    pixQrcodeUrl
  } = req.body || {};

  // 2. Validação rigorosa dos campos
  const cleanWpp = String(whatsapp || '').replace(/\D/g, '');
  if (!cleanWpp || cleanWpp.length < 10) {
    return res.status(400).json({
      sucesso: false,
      error: 'WhatsApp oficial inválido. Informe o número com DDD (mínimo 10 dígitos).'
    });
  }

  const cleanEmail = String(contatoEmail || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({
      sucesso: false,
      error: 'E-mail de contato inválido. Informe um endereço de e-mail completo.'
    });
  }

  const cleanEndereco = String(endereco || '').trim();
  if (!cleanEndereco || cleanEndereco.length < 5) {
    return res.status(400).json({
      sucesso: false,
      error: 'Endereço completo é obrigatório.'
    });
  }

  const payload = {
    id: 'geral',
    whatsapp: cleanWpp,
    instagram: String(instagram || '@backstagekaraoke').trim(),
    maps_url: String(mapsUrl || 'https://maps.app.goo.gl/AwFhL4Z4Au6cqu4v6').trim(),
    endereco: cleanEndereco,
    contato_email: cleanEmail,
    pdf_url: pdfUrl || '/cardapio-oficial.pdf',
    pdf_public_id: pdfPublicId || null,
    pix_chave: String(pixChave || '').trim(),
    pix_tipo_chave: String(pixTipoChave || '').trim(),
    pix_titular: String(pixTitular || '').trim(),
    pix_copia_cola: String(pixCopiaCola || '').trim(),
    pix_qrcode_url: String(pixQrcodeUrl || '').trim(),
    horarios: horarios || {},
    updated_at: new Date().toISOString()
  };

  // 3. Persistência autoritativa no Supabase via REST
  if (supabaseUrl && supabaseKey) {
    try {
      const supaRes = await fetch(`${supabaseUrl}/rest/v1/configuracoes`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!supaRes.ok) {
        const errJson = await supaRes.json().catch(() => ({}));

        // Caso colunas novas ainda não existam no schema remoto do Supabase
        if (errJson?.code === '42703' || errJson?.message?.includes('column') || errJson?.message?.includes('contato_email')) {
          console.warn('[Admin Config] Colunas adicionais ausentes no Supabase, salvando campos essenciais...', errJson?.message);
          const { contato_email, pix_chave, pix_tipo_chave, pix_titular, pix_copia_cola, pix_qrcode_url, ...payloadBase } = payload;
          const retryRes = await fetch(`${supabaseUrl}/rest/v1/configuracoes`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify(payloadBase)
          });

          if (!retryRes.ok) {
            const retryErr = await retryRes.json().catch(() => ({}));
            return res.status(500).json({
              sucesso: false,
              error: `Erro ao gravar no Supabase: ${retryErr.message || 'Falha de gravação (código ' + retryRes.status + ')'}`
            });
          }
        } else {
          return res.status(500).json({
            sucesso: false,
            error: `Erro ao gravar no Supabase: ${errJson.message || 'Falha de gravação (código ' + supaRes.status + ')'}`
          });
        }
      }
    } catch (supaErr) {
      console.error('[Admin Config] Erro de rede com Supabase:', supaErr);
      return res.status(500).json({
        sucesso: false,
        error: 'Erro de comunicação com o banco de dados Supabase: ' + supaErr.message
      });
    }
  }

  console.log(`[Admin Config] Configurações atualizadas com sucesso pelo administrador ${authCheck.user?.email}`);

  return res.status(200).json({
    sucesso: true,
    mensagem: 'Configurações administrativas salvas com sucesso no banco de dados!',
    configuracoes: payload,
    admin: authCheck.user?.email
  });
}
