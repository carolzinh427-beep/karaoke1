/**
-- ==============================================================================
-- BACKSTAGE KARAOKÊ — CLIENTE E SERVIÇOS DO SUPABASE
-- ==============================================================================
-- Gerencia as conexões e operações com o banco de dados PostgreSQL do Supabase,
-- substituindo o Firestore para salas, cardápio, galeria, reservas e configurações.
*/

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('seu-projeto')
);

// Inicializa o cliente do Supabase
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

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
    sinal: sala.sinal || (sala.precoTotal ? sala.precoTotal / 2 : 0),
    restante: sala.restante || (sala.precoTotal ? sala.precoTotal / 2 : 0),
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
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('cardapio')
    .select('*')
    .order('ordem', { ascending: true });

  if (error) throw error;
  return (data || []).map(item => ({
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

export async function saveCardapioItemSupabase(item) {
  if (!supabase) throw new Error('Supabase não configurado');
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

  const { data, error } = await supabase
    .from('cardapio')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCardapioItemSupabase(id) {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase
    .from('cardapio')
    .delete()
    .eq('id', id);

  if (error) throw error;
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
// 5. RESERVAS
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
    nome: r.nome,
    whatsapp: r.whatsapp,
    email: r.email || '',
    data: r.data,
    sala: r.sala,
    pessoas: r.pessoas || 1,
    status: r.status || 'PENDING',
    valorTotal: r.valor_total ? Number(r.valor_total) : null,
    valorSinal: r.valor_sinal ? Number(r.valor_sinal) : null,
    termosAceitos: r.termos_aceitos !== false,
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
    sala: dados.sala,
    pessoas: dados.pessoas || 1,
    status: dados.status || 'PENDING',
    valor_total: dados.valorTotal || null,
    valor_sinal: dados.valorSinal || null,
    termos_aceitos: dados.termosAceitos !== false,
    observacoes: dados.observacoes || '',
    origem: dados.origem || 'site_cliente'
  };
  if (dados.id) payload.id = dados.id;

  const { data, error } = await supabase
    .from('reservas')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReservaStatusSupabase(id, status) {
  if (!supabase) throw new Error('Supabase não configurado');
  const { data, error } = await supabase
    .from('reservas')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
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
    contatoEmail: data.contato_email,
    pdfUrl: data.pdf_url,
    pdfPublicId: data.pdf_public_id,
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
    horarios: config.horarios || {}
  };

  const { data, error } = await supabase
    .from('configuracoes')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
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
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        duration: video.duration ? Math.round(video.duration) : null
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve({ width: null, height: null, duration: null });
      URL.revokeObjectURL(url);
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

  // Coleta dimensões ou duração em paralelo
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
      upsert: true
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
 * Remove um arquivo do Supabase Storage
 */
export async function deleteFileSupabaseStorage(filePathOrUrl) {
  if (!supabase || !filePathOrUrl) return false;
  try {
    let filePath = filePathOrUrl;
    if (filePath.startsWith('http')) {
      const match = filePath.match(new RegExp(`${SUPABASE_STORAGE_BUCKET}\/(.+)`));
      if (match && match[1]) {
        filePath = match[1];
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

