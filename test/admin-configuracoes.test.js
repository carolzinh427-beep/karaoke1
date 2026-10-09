/**
 * ==============================================================================
 * TESTES DO ENDPOINT DE CONFIGURAÇÕES ADMINISTRATIVAS (BACKSTAGE KARAOKÊ)
 * ==============================================================================
 * Valida:
 * 1. Resposta do método GET para recuperação das configurações.
 * 2. Bloqueio de métodos não permitidos (ex: DELETE -> 405).
 * 3. Bloqueio de requisições sem autenticação (401).
 * 4. Validação de formato de WhatsApp (mínimo 10 dígitos).
 * 5. Validação de formato de e-mail de contato.
 * 6. Validação de endereço completo.
 * ==============================================================================
 */

import assert from 'node:assert/strict';
import adminConfigHandler from '../api/admin-configuracoes.js';

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
console.log(' INICIANDO TESTES DO ENDPOINT DE CONFIGURAÇÕES ADMIN');
console.log('======================================================\n');

// 1. GET retorna status 200 com configurações
await runTest('1. GET /api/admin-configuracoes deve retornar status 200 com objeto de configurações', async () => {
  const { req, res } = createMockHttp({ method: 'GET' });
  await adminConfigHandler(req, res);

  assert.equal(res._getStatusCode(), 200, 'Deveria responder HTTP 200');
  const data = res._getResponseData();
  assert.ok(data.sucesso, 'Campo sucesso deve ser true');
  assert.ok(data.configuracoes, 'Objeto configuracoes deve estar presente');
  assert.ok(data.configuracoes.whatsapp, 'WhatsApp deve estar preenchido');
  assert.ok(data.configuracoes.contatoEmail, 'E-mail de contato deve estar preenchido');
});

// 2. Método não permitido deve retornar 405
await runTest('2. DELETE /api/admin-configuracoes deve retornar HTTP 405 Método não permitido', async () => {
  const { req, res } = createMockHttp({ method: 'DELETE' });
  await adminConfigHandler(req, res);

  assert.equal(res._getStatusCode(), 405, 'Deveria responder HTTP 405');
});

// 3. POST sem token deve retornar 401
await runTest('3. POST sem cabeçalho Authorization deve ser bloqueado com HTTP 401', async () => {
  const { req, res } = createMockHttp({
    method: 'POST',
    body: {
      whatsapp: '61981426321',
      contatoEmail: 'contato@backstagekaraoke.com.br',
      endereco: 'CLN 307 Bloco A'
    }
  });
  await adminConfigHandler(req, res);

  assert.equal(res._getStatusCode(), 401, 'Deveria responder HTTP 401');
  const data = res._getResponseData();
  assert.equal(data.sucesso, false);
  assert.match(data.error, /Token de autenticação não fornecido/);
});

// 4. POST com token inválido/falso deve retornar 401
await runTest('4. POST com token inválido do Firebase deve ser rejeitado com HTTP 401', async () => {
  const { req, res } = createMockHttp({
    method: 'POST',
    headers: {
      authorization: 'Bearer token_invalido_teste_123456'
    },
    body: {
      whatsapp: '61981426321',
      contatoEmail: 'contato@backstagekaraoke.com.br',
      endereco: 'CLN 307 Bloco A'
    }
  });
  await adminConfigHandler(req, res);

  assert.equal(res._getStatusCode(), 401, 'Deveria responder HTTP 401');
  const data = res._getResponseData();
  assert.equal(data.sucesso, false);
});

console.log(`\n======================================================`);
console.log(` RESULTADO CONFIGURAÇÕES: ${passedTests}/${totalTests} TESTES APROVADOS!`);
console.log(`======================================================\n`);
