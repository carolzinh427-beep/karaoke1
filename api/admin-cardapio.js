/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — ENDPOINT DE CARDÁPIO ADMINISTRATIVO (SERVERLESS)
 * ==============================================================================
 * Rotas:
 * - GET    /api/admin-cardapio         (Consulta itens do cardápio)
 * - POST   /api/admin-cardapio         (Cria ou atualiza item - restrito a Admin)
 * - DELETE /api/admin-cardapio?id=...  (Exclui item - restrito a Admin)
 * ==============================================================================
 */

import { verifyAdminToken } from './_auth.js';
import { DEFAULT_CARDAPIO } from '../src/lib/catalogData.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://qepsqxllrgtrrtafpwpe.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  // ----------------------------------------------------------------------------
  // GET: Retorna itens cadastrados no Supabase
  // ----------------------------------------------------------------------------
  if (req.method === 'GET') {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({
        sucesso: true,
        origem: 'padrao',
        total: DEFAULT_CARDAPIO.length,
        cardapio: DEFAULT_CARDAPIO
      });
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/cardapio?select=*&order=ordem.asc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      if (!response.ok) {
        return res.status(200).json({
          sucesso: true,
          origem: 'padrao_fallback',
          total: DEFAULT_CARDAPIO.length,
          cardapio: DEFAULT_CARDAPIO
        });
      }

      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(200).json({
          sucesso: true,
          origem: 'padrao_fallback',
          total: DEFAULT_CARDAPIO.length,
          cardapio: DEFAULT_CARDAPIO
        });
      }

      return res.status(200).json({
        sucesso: true,
        origem: 'supabase',
        total: rows.length,
        cardapio: rows.map(item => ({
          id: item.id,
          nome: item.nome,
          preco: Number(item.preco),
          categoriaId: item.categoria_id,
          categoria: item.categoria,
          descricao: item.descricao || '',
          imagem: item.imagem || '',
          imagemPublicId: item.imagem_public_id,
          ativo: item.ativo !== false,
          ordem: item.ordem || 1,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }))
      });
    } catch (err) {
      console.error('[Admin Cardapio] Erro ao consultar itens:', err);
      return res.status(500).json({ sucesso: false, error: err.message });
    }
  }

  // ----------------------------------------------------------------------------
  // Validação de métodos permitidos
  // ----------------------------------------------------------------------------
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({
      sucesso: false,
      error: `Método ${req.method} não permitido. Utilize GET, POST ou DELETE.`
    });
  }

  // ----------------------------------------------------------------------------
  // Validação de autenticação obrigatória para POST e DELETE
  // ----------------------------------------------------------------------------
  const authCheck = await verifyAdminToken(req);
  if (!authCheck.ok) {
    console.warn('[Admin Cardapio] Tentativa não autorizada:', authCheck.error);
    return res.status(authCheck.status || 401).json({
      sucesso: false,
      error: authCheck.error || 'Acesso negado. Apenas administradores autorizados podem alterar o cardápio.'
    });
  }

  // ----------------------------------------------------------------------------
  // POST: Criação ou atualização de item do cardápio
  // ----------------------------------------------------------------------------
  if (req.method === 'POST') {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(503).json({
        sucesso: false,
        error: 'Servidor sem credenciais do Supabase configuradas.'
      });
    }

    const {
      id,
      nome,
      preco,
      categoriaId,
      categoria,
      descricao,
      imagem,
      imagemPublicId,
      ativo,
      ordem
    } = req.body || {};

    const cleanNome = String(nome || '').trim();
    if (!cleanNome) {
      return res.status(400).json({
        sucesso: false,
        error: 'Nome do item é obrigatório.'
      });
    }

    const numPreco = parseFloat(preco);
    if (isNaN(numPreco) || numPreco < 0) {
      return res.status(400).json({
        sucesso: false,
        error: 'Preço deve ser um número válido maior ou igual a zero.'
      });
    }

    // Gera ID único para novo item se não fornecido
    const cleanId = (id && String(id).trim()) || ('item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));

    const payload = {
      id: cleanId,
      nome: cleanNome,
      preco: numPreco,
      categoria_id: categoriaId || null,
      categoria: categoria || 'Geral',
      descricao: (descricao || '').trim(),
      imagem: imagem || '',
      imagem_public_id: imagemPublicId || null,
      ativo: ativo !== false,
      ordem: parseInt(ordem, 10) || 1,
      updated_at: new Date().toISOString()
    };

    try {
      const supaRes = await fetch(`${supabaseUrl}/rest/v1/cardapio`, {
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
        return res.status(supaRes.status).json({
          sucesso: false,
          error: `Erro ao gravar no Supabase: ${errJson.message || 'Código ' + supaRes.status}`
        });
      }

      const savedData = await supaRes.json();
      const savedItem = savedData?.[0] || payload;

      return res.status(200).json({
        sucesso: true,
        mensagem: `Item "${cleanNome}" salvo com sucesso no banco de dados!`,
        item: {
          id: savedItem.id,
          nome: savedItem.nome,
          preco: Number(savedItem.preco),
          categoriaId: savedItem.categoria_id,
          categoria: savedItem.categoria,
          descricao: savedItem.descricao || '',
          imagem: savedItem.imagem || '',
          imagemPublicId: savedItem.imagem_public_id,
          ativo: savedItem.ativo !== false,
          ordem: savedItem.ordem || 1
        }
      });
    } catch (err) {
      console.error('[Admin Cardapio] Erro na gravação:', err);
      return res.status(500).json({
        sucesso: false,
        error: 'Erro de comunicação ao salvar item no Supabase: ' + err.message
      });
    }
  }

  // ----------------------------------------------------------------------------
  // DELETE: Exclusão permanente de item
  // ----------------------------------------------------------------------------
  if (req.method === 'DELETE') {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(503).json({
        sucesso: false,
        error: 'Servidor sem credenciais do Supabase configuradas.'
      });
    }

    const itemId = req.query?.id || req.body?.id;
    if (!itemId) {
      return res.status(400).json({
        sucesso: false,
        error: 'ID do item é obrigatório para exclusão.'
      });
    }

    try {
      const supaRes = await fetch(`${supabaseUrl}/rest/v1/cardapio?id=eq.${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation'
        }
      });

      if (!supaRes.ok) {
        const errJson = await supaRes.json().catch(() => ({}));
        return res.status(supaRes.status).json({
          sucesso: false,
          error: `Erro ao excluir do Supabase: ${errJson.message || 'Código ' + supaRes.status}`
        });
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Item excluído com sucesso do cardápio!',
        id: itemId
      });
    } catch (err) {
      console.error('[Admin Cardapio] Erro ao excluir:', err);
      return res.status(500).json({
        sucesso: false,
        error: 'Erro de comunicação ao excluir item do Supabase: ' + err.message
      });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
