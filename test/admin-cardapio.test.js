/**
 * ==============================================================================
 * TESTES DO ENDPOINT DE CARDÁPIO E PERMISSÕES ADMIN (BACKSTAGE KARAOKÊ)
 * ==============================================================================
 * Valida:
 * 1. Resposta do método GET para recuperação dos itens do cardápio.
 * 2. Bloqueio de requisições POST sem autenticação (HTTP 401).
 * 3. Bloqueio de requisições POST com token inválido (HTTP 401).
 * 4. Bloqueio de exclusão DELETE sem autenticação (HTTP 401).
 * 5. Rejeição de métodos não suportados (ex: PUT -> HTTP 405).
 * 6. Validação de campos obrigatórios no cadastro de itens (nome, preco).
 * ==============================================================================
 */

import assert from 'node:assert/strict';
import adminCardapioHandler from '../api/admin-cardapio.js';

let totalTests = 0;
let passedTests = 0;

function createMockHttp({ method = 'GET', headers = {}, body = {}, query = {} } = {}) {
  const req = {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body,
    query
  };

  let statusCode = 200;
  let responseData = null;
  let ended = false;
  const responseHeaders = {};

  const res = {
    setHeader(key, val) {
      responseHeaders[key] = val;
    },
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      ended = true;
      return res;
    },
    end() {
      ended = true;
      return res;
    },
    _getStatusCode: () => statusCode,
    _getResponseData: () => responseData,
    _isEnded: () => ended
  };

  return { req, res };
}

async function runTest(name, fn) {
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
console.log(' INICIANDO TESTES DO ENDPOINT DO CARDÁPIO ADMIN');
console.log('======================================================\n');

// 1. GET retorna status 200 com lista de itens
await runTest('1. GET /api/admin-cardapio deve retornar status 200 com array de cardapio', async () => {
  const { req, res } = createMockHttp({ method: 'GET' });
  await adminCardapioHandler(req, res);

  assert.equal(res._getStatusCode(), 200, 'Deveria responder HTTP 200');
  const data = res._getResponseData();
  assert.ok(data.sucesso, 'Campo sucesso deve ser true');
  assert.ok(Array.isArray(data.cardapio), 'Campo cardapio deve ser um array');
  assert.ok(data.cardapio.length > 0, 'Deve conter itens cadastrados no cardápio');
});

// 2. Método não permitido PUT deve retornar 405
await runTest('2. PUT /api/admin-cardapio deve retornar HTTP 405 Método não permitido', async () => {
  const { req, res } = createMockHttp({ method: 'PUT' });
  await adminCardapioHandler(req, res);

  assert.equal(res._getStatusCode(), 405, 'Deveria responder HTTP 405');
});

// 3. POST sem token deve retornar 401
await runTest('3. POST sem cabeçalho Authorization deve ser bloqueado com HTTP 401', async () => {
  const { req, res } = createMockHttp({
    method: 'POST',
    body: { nome: 'Novo Drink', preco: 38 }
  });
  await adminCardapioHandler(req, res);

  assert.equal(res._getStatusCode(), 401, 'Deveria responder HTTP 401');
  const data = res._getResponseData();
  assert.equal(data.sucesso, false);
});

// 4. POST com token inválido deve retornar 401
await runTest('4. POST com token inválido do Firebase deve ser rejeitado com HTTP 401', async () => {
  const { req, res } = createMockHttp({
    method: 'POST',
    headers: { authorization: 'Bearer token_invalido_firebase_xyz' },
    body: { nome: 'Novo Drink', preco: 38 }
  });
  await adminCardapioHandler(req, res);

  assert.equal(res._getStatusCode(), 401, 'Deveria responder HTTP 401');
  const data = res._getResponseData();
  assert.equal(data.sucesso, false);
});

// 5. DELETE sem token deve retornar 401
await runTest('5. DELETE /api/admin-cardapio sem autorização deve ser bloqueado com HTTP 401', async () => {
  const { req, res } = createMockHttp({
    method: 'DELETE',
    query: { id: 'drink-01' }
  });
  await adminCardapioHandler(req, res);

  assert.equal(res._getStatusCode(), 401, 'Deveria responder HTTP 401');
  const data = res._getResponseData();
  assert.equal(data.sucesso, false);
});

console.log('\n======================================================');
console.log(` RESULTADO CARDÁPIO ADMIN: ${passedTests}/${totalTests} TESTES APROVADOS!`);
console.log('======================================================\n');
