/**
-- ==============================================================================
-- BACKSTAGE KARAOKÊ — CLIENTE E SERVIÇOS DO SUPABASE
-- ==============================================================================
-- Gerencia as conexões e operações com o banco de dados PostgreSQL do Supabase,
-- substituindo o Firestore para salas, cardápio, galeria, reservas e configurações.
*/

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  'https://qepsqxllrgtrrtafpwpe.supabase.co';

const supabasePublishableKey = 
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) || 
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env?.SUPABASE_PUBLISHABLE_KEY)) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHNxeGxscmd0cnJ0YWZwd3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExOTk4MTMsImV4cCI6MjEwNjc3NTgxM30.SqtA6rfMQVs0t8q9FIcV8M0r6ucV9EIJ7Wj2_X2X0kY';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabasePublishableKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('sua-id-de-projeto')
);

// Inicializa o cliente oficial do Supabase
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

/**
 * Testa a conectividade com o Supabase de forma segura e resiliente.
 */
export async function testSupabaseConnection() {
  if (!supabase) {
    return {
      connected: false,
      configured: false,
      message: 'Supabase aguardando chave no arquivo .env.local',
      url: supabaseUrl
    };
  }

  try {
    const { error } = await supabase.from('salas').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        configured: true,
        message: 'Erro na consulta do Supabase: ' + (error.message || String(error)),
        url: supabaseUrl
      };
    }

    return {
      connected: true,
      configured: true,
      status: 200,
      message: 'Conexão com a API do Supabase estabelecida com sucesso!',
      url: supabaseUrl
    };
  } catch (err) {
    return {
      connected: false,
      configured: true,
      message: 'Erro ao conectar ao endpoint do Supabase: ' + (err.message || String(err)),
      url: supabaseUrl
    };
  }
}

// ==============================================================================
// 1. SALAS
// ==============================================================================
export async function getSalasSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('salas')
    .select('*')
    .order('ordem', { ascending: true });

  if (error) throw error;
  return (data || []).map(s => ({
    id: s.id,
    nome: s.nome,
    slug: s.slug,
    capacidade: s.capacidade,
    precoTotal: Number(s.preco_total),
    sinal: Number(s.sinal),
    restante: Number(s.restante),
    descricao: s.descricao || '',
    imagem: s.imagem || '',
    publicId: s.public_id,
    ativo: s.ativo !== false,
    ordem: s.ordem || 1,
    createdAt: s.created_at,
    updatedAt: s.updated_at
  }));
}

export async function saveSalaSupabase(sala) {
  if (!supabase) throw new Error('Supabase não configurado');
  const payload = {
    id: sala.id,
    nome: sala.nome,
    slug: sala.slug || sala.id,
    capacidade: sala.capacidade || 30,
    preco_total: sala.precoTotal || 0,
    sinal: sala.sinal !== undefined ? sala.sinal : (sala.precoTotal || 0),
    restante: sala.restante !== undefined ? sala.restante : 0,
    descricao: sala.descricao || '',
    ativo: sala.ativo !== false,
    ordem: sala.ordem || 1,
  };
  if (sala.imagem) payload.imagem = sala.imagem;
  if (sala.publicId) payload.public_id = sala.publicId;

  const { data, error } = await supabase
    .from('salas')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==============================================================================
// 2. CATEGORIAS DO CARDÁPIO
// ==============================================================================
export async function getCategoriasSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('categorias_cardapio')
    .select('*')
    .order('ordem', { ascending: true });

  if (error) throw error;
  return (data || []).map(c => ({
    id: c.id,
    nome: c.nome,
    ordem: c.ordem || 1,
    ativo: c.ativo !== false
  }));
}

// ==============================================================================
// 3. ITENS DO CARDÁPIO
// ==============================================================================
export async function getCardapioSupabase() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cardapio')
        .select('*')
        .order('ordem', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(item => ({
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
        }));
      }
    } catch (directErr) {
      console.warn('Tentativa direta Supabase cardápio:', directErr.message);
    }
  }

  // Fallback via endpoint Serverless oficial
  try {
    const res = await fetch('/api/admin-cardapio');
    if (res.ok) {
      const json = await res.json();
      if (json.sucesso && Array.isArray(json.cardapio)) {
        return json.cardapio;
      }
    }
  } catch (apiErr) {
    console.warn('Erro ao consultar /api/admin-cardapio:', apiErr.message);
  }

  return null;
}

export async function saveCardapioItemSupabase(item, idToken = null) {
  const payload = {
    nome: item.nome,
    preco: item.preco || 0,
    categoria_id: item.categoriaId,
    categoria: item.categoria,
    descricao: item.descricao || '',
    ativo: item.ativo !== false,
    ordem: item.ordem || 1
  };
  if (item.id) payload.id = item.id;
  if (item.imagem) payload.imagem = item.imagem;
  if (item.imagemPublicId) payload.imagem_public_id = item.imagemPublicId;

  // 1. Tenta salvar via cliente direto do Supabase se configurado
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cardapio')
        .upsert(payload)
        .select()
        .single();

      if (!error && data) {
        return data;
      }
      console.warn('Aviso Supabase direto:', error?.message);
    } catch (err) {
      console.warn('Exceção Supabase direto:', err.message);
    }
  }

  // 2. Persiste via Serverless API /api/admin-cardapio com autenticação
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const res = await fetch('/api/admin-cardapio', {
    method: 'POST',
    headers,
    body: JSON.stringify(item)
  });

  const resData = await res.json().catch(() => ({}));
  if (!res.ok || !resData.sucesso) {
    throw new Error(resData.error || `Falha ao salvar no banco de dados (HTTP ${res.status}).`);
  }

  return resData.item || payload;
}

export async function deleteCardapioItemSupabase(id, idToken = null) {
  if (!id) throw new Error('ID do item obrigatório para exclusão.');

  // 1. Tenta excluir via cliente direto do Supabase se configurado
  if (supabase) {
    try {
      const { error } = await supabase
        .from('cardapio')
        .delete()
        .eq('id', id);

      if (!error) return true;
      console.warn('Aviso Supabase delete direto:', error?.message);
    } catch (err) {
      console.warn('Exceção Supabase delete direto:', err.message);
    }
  }

  // 2. Exclui via Serverless API /api/admin-cardapio
  const headers = {};
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const res = await fetch(`/api/admin-cardapio?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers
  });

  const resData = await res.json().catch(() => ({}));
  if (!res.ok || !resData.sucesso) {
    throw new Error(resData.error || `Falha ao excluir item no banco de dados (HTTP ${res.status}).`);
  }

  return true;
}

// ==============================================================================
// 4. GALERIA DE MÍDIA
// ==============================================================================
export async function getGaleriaSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('galeria')
    .select('*')
    .order('ordem', { ascending: true });

  if (error) throw error;
  return (data || []).map(g => ({
    id: g.id,
    tipo: g.tipo,
    sala: g.sala,
    titulo: g.titulo || '',
    url: g.url,
    publicId: g.public_id,
    formato: g.formato,
    largura: g.largura,
    altura: g.altura,
    duracao: g.duracao ? Number(g.duracao) : null,
    tamanhoBytes: g.tamanho_bytes ? Number(g.tamanho_bytes) : null,
    nomeArquivo: g.nome_arquivo,
    ativo: g.ativo !== false,
    ordem: g.ordem || 1,
    criadoEm: g.created_at ? new Date(g.created_at) : new Date(),
    atualizadoEm: g.updated_at ? new Date(g.updated_at) : new Date()
  }));
}

export async function saveGaleriaItemSupabase(item) {
  if (!supabase) throw new Error('Supabase não configurado');
  const payload = {
    tipo: item.tipo || 'imagem',
    sala: item.sala || 'geral',
    titulo: item.titulo || '',
    url: item.url,
    public_id: item.publicId || null,
    formato: item.formato || null,
    largura: item.largura || null,
    altura: item.altura || null,
    duracao: item.duracao || null,
    tamanho_bytes: item.tamanhoBytes || null,
    nome_arquivo: item.nomeArquivo || null,
    ativo: item.ativo !== false,
    ordem: item.ordem || 1
  };
  if (item.id) payload.id = item.id;

  const { data, error } = await supabase
    .from('galeria')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGaleriaItemSupabase(id) {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase
    .from('galeria')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ==============================================================================
// 5. RESERVAS & INGRESSOS (COM COMPLIANCE LEGAL, LGPD E ECA)
// ==============================================================================
export async function getReservasSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    codigoReserva: r.codigo_reserva || '',
    nome: r.nome,
    whatsapp: r.whatsapp,
    email: r.email || '',
    data: r.data,
    horario: r.horario || '19:00',
    ambienteId: r.ambiente_id || 'salas-privadas',
    salaOuMesa: r.sala_ou_mesa || '',
    sala: r.sala,
    pessoas: r.pessoas || 1,
    status: r.status || 'PENDING',
    statusPagamento: r.status_pagamento || 'aguardando',
    transacaoId: r.transacao_id || null,
    qrCodeToken: r.qr_code_token || null,
    valorTotal: r.valor_total ? Number(r.valor_total) : null,
    valorSinal: r.valor_sinal ? Number(r.valor_sinal) : null,
    valorPago: r.valor_pago ? Number(r.valor_pago) : null,
    valorRestante: r.valor_restante !== null && r.valor_restante !== undefined ? Number(r.valor_restante) : null,
    termosAceitos: r.termos_aceitos !== false,
    termosAceitosEm: r.termos_aceitos_em,
    termosVersao: r.termos_versao || '2026.1',
    consentimentoMarketing: Boolean(r.consentimento_marketing),
    presencaMenor: Boolean(r.presenca_menor),
    responsavelLegalDeclarado: Boolean(r.responsavel_legal_declarado),
    checkedInAt: r.checked_in_at,
    observacoes: r.observacoes || '',
    origem: r.origem || 'site_cliente',
    criadoEm: r.created_at ? new Date(r.created_at) : new Date(),
    dataCriacao: r.created_at
  }));
}

export async function saveReservaSupabase(dados) {
  if (!supabase) throw new Error('Supabase não configurado');
  const payload = {
    nome: dados.nome,
    whatsapp: dados.whatsapp,
    email: dados.email || null,
    data: dados.data,
    horario: dados.horario || '19:00',
    ambiente_id: dados.ambienteId || 'salas-privadas',
    sala_ou_mesa: dados.salaOuMesa || dados.sala || '',
    sala: dados.sala,
    pessoas: dados.pessoas || 1,
    status: dados.status || 'PENDING',
    status_pagamento: dados.statusPagamento || 'aguardando',
    valor_total: dados.valorTotal || null,
    valor_sinal: dados.valorSinal || null,
    valor_pago: dados.valorPago || null,
    valor_restante: dados.valorRestante !== undefined ? dados.valorRestante : null,
    termos_aceitos: dados.termosAceitos !== false,
    termos_versao: dados.termosVersao || '2026.1',
    consentimento_marketing: Boolean(dados.consentimentoMarketing),
    presenca_menor: Boolean(dados.presencaMenor),
    responsavel_legal_declarado: Boolean(dados.responsavelLegalDeclarado),
    observacoes: dados.observacoes || '',
    origem: dados.origem || 'site_cliente'
  };
  if (dados.id) payload.id = dados.id;
  if (dados.codigoReserva) payload.codigo_reserva = dados.codigoReserva;
  if (dados.transacaoId) payload.transacao_id = dados.transacaoId;
  if (dados.qrCodeToken) payload.qr_code_token = dados.qrCodeToken;

  const { data, error } = await supabase
    .from('reservas')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Criação da reserva com estrita conformidade legal (LGPD, ECA e CDC)
 */
export async function criarReservaComCompliance(dados) {
  if (!supabase) throw new Error('Supabase não configurado');
  const payload = {
    codigo_reserva: dados.codigoReserva,
    nome: dados.nome,
    whatsapp: dados.whatsapp,
    email: dados.email || null,
    data: dados.data,
    horario: dados.horario || '19:00',
    ambiente_id: dados.ambienteId || 'salas-privadas',
    sala_ou_mesa: dados.salaOuMesa || dados.sala || '',
    sala: dados.sala,
    pessoas: dados.pessoas || 1,
    status: dados.status || 'PENDING',
    status_pagamento: dados.statusPagamento || 'aguardando',
    transacao_id: dados.transacaoId || null,
    qr_code_token: dados.qrCodeToken || null,
    valor_total: dados.valorTotal || null,
    valor_sinal: dados.valorSinal || null,
    valor_pago: dados.valorPago || null,
    termos_aceitos: true,
    termos_aceitos_em: new Date().toISOString(),
    termos_versao: dados.termosVersao || '2026.1',
    consentimento_marketing: Boolean(dados.consentimentoMarketing),
    presenca_menor: Boolean(dados.presencaMenor),
    responsavel_legal_declarado: Boolean(dados.responsavelLegalDeclarado),
    observacoes: dados.observacoes || '',
    origem: dados.origem || 'site_cliente'
  };

  const { data, error } = await supabase
    .from('reservas')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Busca uma reserva pelo seu código único BK-AAAA-XXXX
 */
export async function buscarReservaPorCodigo(codigo) {
  if (!supabase) return null;
  const cleanCode = (codigo || '').trim().toUpperCase();
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('codigo_reserva', cleanCode)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Validação de check-in na recepção/portaria
 */
export async function validarCheckInReserva(codigoOuId) {
  if (!supabase) throw new Error('Supabase não configurado');
  const clean = (codigoOuId || '').trim();

  // Busca por código ou por ID
  let query = supabase.from('reservas').select('*');
  if (clean.startsWith('BK-')) {
    query = query.eq('codigo_reserva', clean.toUpperCase());
  } else {
    query = query.eq('id', clean);
  }

  const { data: reserva, error: findError } = await query.maybeSingle();
  if (findError) throw findError;
  if (!reserva) {
    return { success: false, message: 'Reserva não encontrada. Verifique o código digitado.' };
  }

  if (reserva.status === 'CHECKED_IN') {
    return {
      success: false,
      alreadyCheckedIn: true,
      message: `Atenção: Check-in já havia sido realizado em ${new Date(reserva.checked_in_at).toLocaleTimeString('pt-BR')}.`,
      reserva
    };
  }

  if (reserva.status === 'CANCELLED') {
    return {
      success: false,
      message: 'Esta reserva consta como CANCELADA no sistema.',
      reserva
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('reservas')
    .update({
      status: 'CHECKED_IN',
      checked_in_at: now
    })
    .eq('id', reserva.id)
    .select()
    .single();

  if (updateError) throw updateError;
  return {
    success: true,
    message: 'Check-in realizado com sucesso! Entrada liberada.',
    reserva: updated
  };
}

/**
 * Registra formalmente a trilha de auditoria do aceite da LGPD
 */
export async function registrarConsentimentoLGPD({ reservaId, email, tipoDocumento, versao = '2026.1', aceito = true }) {
  if (!supabase || !email) return null;
  try {
    const { data, error } = await supabase
      .from('registros_consentimento')
      .insert([{
        reserva_id: reservaId || null,
        email,
        tipo_documento: tipoDocumento,
        versao,
        aceito
      }])
      .select()
      .maybeSingle();

    if (error) console.warn('Erro ao registrar consentimento LGPD:', error);
    return data;
  } catch (e) {
    console.warn('Falha silenciosa ao registrar LGPD:', e);
    return null;
  }
}

/**
 * Registra o histórico seguro do pagamento (sem dados de cartão)
 */
export async function registrarPagamentoSeguro(pagamento) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('pagamentos')
      .insert([{
        reserva_id: pagamento.reservaId || null,
        codigo_reserva: pagamento.codigoReserva,
        gateway: pagamento.gateway || 'gateway_independente',
        transacao_id: pagamento.transacaoId,
        valor: pagamento.valor,
        metodo: pagamento.metodo || 'pix',
        status: pagamento.status || 'aprovado',
        comprador_email: pagamento.compradorEmail || null,
        pago_em: pagamento.pagoEm || new Date().toISOString()
      }])
      .select()
      .maybeSingle();

    if (error) console.warn('Erro ao salvar histórico de pagamento:', error);
    return data;
  } catch (e) {
    console.warn('Falha silenciosa ao registrar pagamento:', e);
    return null;
  }
}

/**
 * Busca ambientes cadastrados no Supabase
 */
export async function getAmbientesSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('ambientes')
    .select('*')
    .eq('ativo', true);

  if (error) throw error;
  return data || [];
}

export async function updateReservaStatusSupabase(id, status, extraFields = {}) {
  if (!supabase) throw new Error('Supabase não configurado');
  const payload = { status, ...extraFields };
  const { data, error } = await supabase
    .from('reservas')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReservaFinanceiroSupabase(id, {
  status = 'CONFIRMED',
  statusPagamento = 'aprovado',
  valorPago = null,
  valorRestante = null,
  observacoes = null
} = {}) {
  if (!supabase) throw new Error('Supabase não configurado');
  const payload = {
    status,
    status_pagamento: statusPagamento,
    atualizado_em: new Date().toISOString()
  };
  if (valorPago !== null && valorPago !== undefined) payload.valor_pago = Number(valorPago);
  if (valorRestante !== null && valorRestante !== undefined) payload.valor_restante = Number(valorRestante);
  if (observacoes !== null && observacoes !== undefined) payload.observacoes = observacoes;

  try {
    const { data, error } = await supabase
      .from('reservas')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '42703' || error.message?.includes('valor_restante')) {
        const { valor_restante, ...fallbackPayload } = payload;
        const retry = await supabase
          .from('reservas')
          .update(fallbackPayload)
          .eq('id', id)
          .select()
          .single();
        if (retry.error) throw retry.error;
        return retry.data;
      }
      throw error;
    }
    return data;
  } catch (err) {
    console.warn('Erro ao atualizar financeiro da reserva no Supabase:', err.message);
    throw err;
  }
}

export async function deleteReservaSupabase(id) {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase
    .from('reservas')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ==============================================================================
// 6. BLOQUEIOS
// ==============================================================================
export async function getBloqueiosSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('bloqueios')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(b => ({
    id: b.id,
    data: b.data,
    tipo: b.tipo || 'dia_inteiro',
    sala: b.sala || 'todas',
    horario: b.horario || 'Dia Inteiro',
    motivo: b.motivo || ''
  }));
}

export async function saveBloqueioSupabase(bloqueio) {
  if (!supabase) throw new Error('Supabase não configurado');
  const payload = {
    data: bloqueio.data,
    tipo: bloqueio.tipo || 'dia_inteiro',
    sala: bloqueio.sala || 'todas',
    horario: bloqueio.horario || 'Dia Inteiro',
    motivo: bloqueio.motivo || ''
  };
  if (bloqueio.id) payload.id = bloqueio.id;

  const { data, error } = await supabase
    .from('bloqueios')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBloqueioSupabase(id) {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase
    .from('bloqueios')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ==============================================================================
// 7. CONFIGURAÇÕES GERAIS
// ==============================================================================
export async function getConfiguracoesSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('id', 'geral')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    whatsapp: data.whatsapp,
    instagram: data.instagram,
    mapsUrl: data.maps_url,
    endereco: data.endereco,
    contatoEmail: data.contato_email || undefined,
    pdfUrl: data.pdf_url,
    pdfPublicId: data.pdf_public_id,
    pixChave: data.pix_chave || '',
    pixTipoChave: data.pix_tipo_chave || '',
    pixTitular: data.pix_titular || '',
    pixCopiaCola: data.pix_copia_cola || '',
    pixQrcodeUrl: data.pix_qrcode_url || '',
    horarios: data.horarios || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function saveConfiguracoesSupabase(config) {
  if (!supabase) throw new Error('Supabase não configurado');
  const payload = {
    id: 'geral',
    whatsapp: config.whatsapp,
    instagram: config.instagram,
    maps_url: config.mapsUrl,
    endereco: config.endereco,
    contato_email: config.contatoEmail || '',
    pdf_url: config.pdfUrl || '/cardapio-oficial.pdf',
    pdf_public_id: config.pdfPublicId || null,
    pix_chave: config.pixChave || '',
    pix_tipo_chave: config.pixTipoChave || '',
    pix_titular: config.pixTitular || '',
    pix_copia_cola: config.pixCopiaCola || '',
    pix_qrcode_url: config.pixQrcodeUrl || '',
    horarios: config.horarios || {}
  };

  const { data, error } = await supabase
    .from('configuracoes')
    .upsert(payload)
    .select()
    .maybeSingle();

  if (error) {
    // Se colunas novas ainda não existirem no schema remoto
    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('contato_email')) {
      console.warn('Aviso: colunas adicionais não encontradas no Supabase. Gravando campos essenciais...', error.message);
      const { contato_email, pix_chave, pix_tipo_chave, pix_titular, pix_copia_cola, pix_qrcode_url, ...payloadBase } = payload;
      const retry = await supabase
        .from('configuracoes')
        .upsert(payloadBase)
        .select()
        .maybeSingle();
      if (retry.error) throw retry.error;
      return retry.data;
    }
    throw error;
  }
  return data;
}

// ==============================================================================
// 8. SUPABASE STORAGE (UPLOADS DE FOTOS, VÍDEOS E DOCUMENTOS)
// ==============================================================================
export const SUPABASE_STORAGE_BUCKET = 'backstage-media';

/**
 * Extrai dimensões de uma imagem antes do envio (largura e altura)
 */
function getImageDimensions(file) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
      return resolve({ width: null, height: null });
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Extrai metadados de vídeo antes do envio (duração em segundos, largura e altura)
 */
function getVideoMetadata(file) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !file.type.startsWith('video/')) {
      return resolve({ width: null, height: null, duration: null });
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null, duration: null });
    }, 3000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const res = {
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        duration: video.duration ? Math.round(video.duration) : null
      };
      URL.revokeObjectURL(url);
      resolve(res);
    };
    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null, duration: null });
    };
    video.src = url;
  });
}

/**
 * Faz upload de imagem, vídeo ou PDF diretamente no Supabase Storage.
 * Retorna URL pública e metadados completos para salvar nas tabelas do Supabase.
 */
export async function uploadFileSupabaseStorage({ file, folder = 'galeria', tipo = null, onProgress = null }) {
  if (!supabase) throw new Error('Supabase não está configurado.');
  if (!file) throw new Error('Nenhum arquivo fornecido para upload.');

  // Determina tipo e formato
  const fileExt = (file.name.split('.').pop() || 'bin').toLowerCase();
  const isVideo = tipo === 'video' || file.type.startsWith('video/');
  const isPdf = tipo === 'pdf' || file.type === 'application/pdf';
  const finalTipo = isVideo ? 'video' : (isPdf ? 'pdf' : 'imagem');

  // Coleta dimensões ou duração em paralelo sem carregar todo o arquivo na memória
  let metadata = { width: null, height: null, duration: null };
  try {
    if (isVideo) {
      metadata = await getVideoMetadata(file);
    } else if (!isPdf) {
      metadata = await getImageDimensions(file);
    }
  } catch (e) {
    console.warn('Erro ao extrair metadados locais:', e);
  }

  // Nome único e limpo para o arquivo
  const cleanBaseName = (file.name || 'arquivo')
    .replace(/\.[^/.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);

  const filePath = `${folder}/${Date.now()}_${cleanBaseName}.${fileExt}`;

  if (onProgress) onProgress(25);

  // Upload no bucket do Supabase Storage
  const { data, error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || undefined
    });

  if (error) {
    if (error.message && (error.message.includes('Bucket not found') || error.message.includes('does not exist'))) {
      throw new Error(`Bucket "${SUPABASE_STORAGE_BUCKET}" não foi encontrado no Supabase Storage. Execute o script schema.sql no SQL Editor do Supabase ou crie o bucket público "${SUPABASE_STORAGE_BUCKET}".`);
    }
    throw error;
  }

  if (onProgress) onProgress(85);

  // Obtém a URL pública do arquivo
  const { data: publicUrlData } = supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(filePath);

  if (onProgress) onProgress(100);

  return {
    url: publicUrlData.publicUrl,
    path: filePath,
    publicId: filePath,
    nomeArquivo: file.name,
    tamanhoBytes: file.size,
    formato: fileExt,
    tipo: finalTipo,
    largura: metadata.width,
    altura: metadata.height,
    duracao: metadata.duration,
  };
}

/**
 * Obtém URL pública ou assinada do Supabase Storage
 */
export async function getFileUrlSupabaseStorage(filePath, isPublic = true) {
  if (!supabase || !filePath) return null;
  if (isPublic) {
    const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || null;
  }
  const { data, error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).createSignedUrl(filePath, 3600);
  if (error) {
    console.warn('Erro ao gerar signed URL:', error);
    return null;
  }
  return data?.signedUrl || null;
}

/**
 * Remove um arquivo do Supabase Storage
 */
export async function deleteFileSupabaseStorage(filePathOrUrl) {
  if (!supabase || !filePathOrUrl) return false;
  try {
    let filePath = filePathOrUrl;
    if (filePath.startsWith('http')) {
      const match = filePath.match(new RegExp(`${SUPABASE_STORAGE_BUCKET}\/(.+)`));
      if (match && match[1]) {
        filePath = decodeURIComponent(match[1].split('?')[0]);
      }
    }

    const { error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.warn('Aviso ao remover do Supabase Storage:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao deletar arquivo do Supabase Storage:', err);
    return false;
  }
}

