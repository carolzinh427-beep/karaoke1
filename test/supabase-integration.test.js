/**
 * ==============================================================================
 * TESTE DE INTEGRAÇÃO & COERÊNCIA DO BANCO DE DADOS E STORAGE DO SUPABASE
 * ==============================================================================
 * Valida:
 * 1. Conexão real com a API do Supabase PostgreSQL.
 * 2. Consulta e estrutura de dados de Salas (Red R$ 800, Green R$ 900, Blue R$ 1.000).
 * 3. Categorias e itens do cardápio cadastrados.
 * 4. Configurações gerais (com campos Pix manual e WhatsApp oficial).
 * 5. Supabase Storage: bucket 'backstage-media' público e geração de URLs de mídia.
 * ==============================================================================
 */

import assert from 'node:assert/strict';
import {
  isSupabaseConfigured,
  testSupabaseConnection,
  getSalasSupabase,
  getCategoriasSupabase,
  getCardapioSupabase,
  getConfiguracoesSupabase,
  SUPABASE_STORAGE_BUCKET,
  getFileUrlSupabaseStorage,
  supabase
} from '../src/lib/supabase.js';

let totalTests = 0;
let passedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASSOU] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FALHOU] ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

console.log('\n======================================================');
console.log(' TESTANDO INTEGRAÇÃO SUPABASE & STORAGE (BACKSTAGE)');
console.log('======================================================\n');

// 1. Configuração do cliente
await test('1. Cliente Supabase deve estar configurado com URL e chave válidas', () => {
  assert.equal(isSupabaseConfigured, true, 'isSupabaseConfigured deve ser true');
  assert.ok(supabase, 'Instância supabase deve existir');
});

// 2. Conectividade
await test('2. Conexão com o endpoint Supabase deve responder com sucesso', async () => {
  const conn = await testSupabaseConnection();
  assert.equal(conn.connected, true, `Deveria conectar com sucesso: ${conn.message}`);
  assert.equal(conn.configured, true);
});

// 3. Salas
await test('3. Salas devem ser recuperadas com preços oficiais integrais (Red 800, Green 900, Blue 1000)', async () => {
  const salas = await getSalasSupabase();
  assert.ok(Array.isArray(salas), 'Salas deve ser um array');
  assert.equal(salas.length, 3, 'Devem existir 3 salas cadastradas');

  const red = salas.find(s => s.id === 'sala-red');
  assert.ok(red, 'Sala Red deve existir');
  assert.equal(red.precoTotal, 800, 'Sala Red deve custar R$ 800,00');

  const green = salas.find(s => s.id === 'sala-green');
  assert.ok(green, 'Sala Green deve existir');
  assert.equal(green.precoTotal, 900, 'Sala Green deve custar R$ 900,00');

  const blue = salas.find(s => s.id === 'sala-blue');
  assert.ok(blue, 'Sala Blue deve existir');
  assert.equal(blue.precoTotal, 1000, 'Sala Blue deve custar R$ 1.000,00');
});

// 4. Categorias do Cardápio
await test('4. Categorias do cardápio devem conter as 9 categorias oficiais', async () => {
  const cats = await getCategoriasSupabase();
  assert.ok(Array.isArray(cats), 'Categorias deve ser um array');
  assert.ok(cats.length >= 9, 'Devem existir pelo menos 9 categorias');

  const petiscos = cats.find(c => c.id === 'petiscos');
  assert.ok(petiscos, 'Categoria petiscos deve existir');
});

// 5. Cardápio
await test('5. Cardápio deve conter os itens oficiais cadastrados no banco', async () => {
  const cardapio = await getCardapioSupabase();
  assert.ok(Array.isArray(cardapio), 'Cardápio deve ser um array');
  assert.ok(cardapio.length >= 77, 'Devem existir mais de 77 itens cadastrados');

  const batata = cardapio.find(i => i.id === 'batata-frita');
  assert.ok(batata, 'Item batata-frita deve existir');
  assert.equal(batata.preco, 24.99);
});

// 6. Configurações gerais
await test('6. Configurações gerais devem ser recuperadas com horários e campos de Pix', async () => {
  const conf = await getConfiguracoesSupabase();
  assert.ok(conf, 'Configurações devem existir');
  assert.equal(conf.id, 'geral');
  assert.ok(conf.whatsapp, 'WhatsApp oficial deve estar preenchido');
  assert.ok(conf.horarios, 'Horários devem estar presentes');
  assert.ok(typeof conf.pixChave === 'string', 'pixChave deve ser uma string');
  assert.ok(typeof conf.pixTipoChave === 'string', 'pixTipoChave deve ser uma string');
  assert.ok(typeof conf.pixTitular === 'string', 'pixTitular deve ser uma string');
  assert.ok(typeof conf.pixQrcodeUrl === 'string', 'pixQrcodeUrl deve ser uma string');
});

// 7. Supabase Storage
await test('7. Supabase Storage deve apontar para o bucket público "backstage-media" e gerar URLs válidas', async () => {
  assert.equal(SUPABASE_STORAGE_BUCKET, 'backstage-media');
  const testPath = 'galeria/teste_imagem.webp';
  const url = await getFileUrlSupabaseStorage(testPath, true);
  assert.ok(url, 'URL pública gerada não pode ser nula');
  assert.ok(url.includes('backstage-media'), 'URL deve conter o nome do bucket backstage-media');
  assert.ok(url.includes(testPath), 'URL deve conter o caminho do arquivo');
});

console.log('\n======================================================');
console.log(` RESULTADO FINAL SUPABASE: ${passedTests}/${totalTests} TESTES APROVADOS!`);
console.log('======================================================\n');
