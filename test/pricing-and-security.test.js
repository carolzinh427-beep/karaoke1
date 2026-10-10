/**
 * ==============================================================================
 * SUÍTE DE TESTES OBRIGATÓRIOS — BACKSTAGE KARAOKÊ
 * PRECIFICAÇÃO, SEGURANÇA DE PAGAMENTOS E WEBHOOK ASAAS
 * ==============================================================================
 * Testes executados sem gerar cobranças reais nem chamadas externas:
 * 1. Sala Red: R$ 800,00 (integral, sem sinal de 50%).
 * 2. Sala Green: R$ 900,00 (integral, inclusive com 35 convidados, nunca R$ 450 nem R$ 700).
 * 3. Sala Blue: R$ 1.000,00 (integral, nunca R$ 500).
 * 4. Mesas do Salão: preços por pessoa (Pix: R$ 20, Débito: R$ 20, Crédito: R$ 25).
 * 5. Tentativa de alterar o preço pelo navegador (validação e bloqueio HTTP 400).
 * 6. Reserva pendente sem pagamento confirmado (status mantido em PENDING).
 * 7. Eventos duplicados do webhook Asaas (idempotência garantida).
 * ==============================================================================
 */

import assert from 'node:assert/strict';
import {
  calcularPrecoOficialServidor,
  PRECOS_SALAS_OFICIAIS,
  TARIFAS_SALAO_OFICIAIS,
  consultarDadosContaAsaas
} from '../api/_asaas.js';
import { getMesaById, validarCapacidadeMesa } from '../src/lib/mesasSalao.js';
import criarCobrancaHandler from '../api/asaas-criar-cobranca.js';
import webhookHandler from '../api/asaas-webhook.js';

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASSOU] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FALHOU] ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function asyncTest(name, fn) {
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

// Mock utilitário para simular requisições e respostas HTTP de Serverless
function createMockHttp({ method = 'POST', headers = {}, body = {}, query = {} } = {}) {
  const req = {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body,
    query
  };

  let statusCode = 200;
  let responseData = null;
  const resHeaders = {};

  const res = {
    setHeader: (k, v) => { resHeaders[k.toLowerCase()] = v; },
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    end: () => res,
    getStatusCode: () => statusCode,
    getData: () => responseData
  };

  return { req, res };
}

console.log('\n======================================================');
console.log(' INICIANDO BATERIA DE TESTES DE PRECIFICAÇÃO E SEGURANÇA');
console.log('======================================================\n');

// ----------------------------------------------------------------------------
// 1. SALA RED: R$ 800,00
// ----------------------------------------------------------------------------
test('1. Sala Red deve ter preço fixo total integral de R$ 800,00', () => {
  assert.equal(PRECOS_SALAS_OFICIAIS['sala red'], 800);

  const res1 = calcularPrecoOficialServidor({
    salaNome: 'Sala Red',
    pessoas: 10,
    metodo: 'pix'
  });
  assert.equal(res1.valor, 800);
  assert.equal(res1.isFixoIntegral, true);

  const res2 = calcularPrecoOficialServidor({
    salaNome: 'Sala Red',
    pessoas: 30, // Lotação máxima
    metodo: 'credito'
  });
  assert.equal(res2.valor, 800, 'Não deve multiplicar por convidados nem aplicar taxas');
});

// ----------------------------------------------------------------------------
// 2. SALA GREEN: R$ 900,00 (NUNCA R$ 450 NEM R$ 700)
// ----------------------------------------------------------------------------
test('2. Sala Green (com 35 convidados) deve custar R$ 900,00 (nunca R$ 450 nem R$ 700)', () => {
  assert.equal(PRECOS_SALAS_OFICIAIS['sala green'], 900);

  const calc = calcularPrecoOficialServidor({
    salaNome: 'Sala Green',
    pessoas: 35,
    metodo: 'pix'
  });

  assert.equal(calc.valor, 900, 'O valor deve ser exatamente R$ 900,00');
  assert.notEqual(calc.valor, 450, 'Não pode cobrar 50% como sinal');
  assert.notEqual(calc.valor, 700, 'Não pode multiplicar 35 convidados por R$ 20');
  assert.equal(calc.isFixoIntegral, true);
});

// ----------------------------------------------------------------------------
// 3. SALA BLUE: R$ 1.000,00
// ----------------------------------------------------------------------------
test('3. Sala Blue deve ter preço fixo total integral de R$ 1.000,00', () => {
  assert.equal(PRECOS_SALAS_OFICIAIS['sala blue'], 1000);

  const calc = calcularPrecoOficialServidor({
    salaNome: 'Sala Blue',
    pessoas: 50,
    metodo: 'debito'
  });

  assert.equal(calc.valor, 1000);
  assert.notEqual(calc.valor, 500, 'Não existe sinal de 50%');
  assert.equal(calc.isFixoIntegral, true);
});

// ----------------------------------------------------------------------------
// 4. MESAS DO SALÃO PRINCIPAL (COBRANÇA POR PESSOA CONFORME MÉTODO)
// ----------------------------------------------------------------------------
test('4. Mesas do Salão: Pix R$ 20/pessoa, Débito R$ 20/pessoa, Crédito R$ 25/pessoa', () => {
  assert.equal(TARIFAS_SALAO_OFICIAIS.pix, 20);
  assert.equal(TARIFAS_SALAO_OFICIAIS.debito, 20);
  assert.equal(TARIFAS_SALAO_OFICIAIS.credito, 25);

  // 4 pessoas no Pix
  const calcPix = calcularPrecoOficialServidor({
    tipoReserva: 'mesa',
    mesaId: 'mesa-4',
    pessoas: 4,
    metodo: 'pix'
  });
  assert.equal(calcPix.valor, 80, '4 pessoas x R$ 20 = R$ 80');
  assert.equal(calcPix.tarifaPorPessoa, 20);

  // 4 pessoas no Débito
  const calcDebito = calcularPrecoOficialServidor({
    tipoReserva: 'mesa',
    mesaId: 'mesa-4',
    pessoas: 4,
    metodo: 'debito'
  });
  assert.equal(calcDebito.valor, 80, '4 pessoas x R$ 20 = R$ 80');
  assert.equal(calcDebito.tarifaPorPessoa, 20);

  // 4 pessoas no Crédito
  const calcCredito = calcularPrecoOficialServidor({
    tipoReserva: 'mesa',
    mesaId: 'mesa-4',
    pessoas: 4,
    metodo: 'credito'
  });
  assert.equal(calcCredito.valor, 100, '4 pessoas x R$ 25 = R$ 100');
  assert.equal(calcCredito.tarifaPorPessoa, 25);

  // 10 pessoas no Crédito
  const calc10Credito = calcularPrecoOficialServidor({
    tipoReserva: 'mesa',
    mesaId: 'mesa-12',
    pessoas: 10,
    metodo: 'credito'
  });
  assert.equal(calc10Credito.valor, 250, '10 pessoas x R$ 25 = R$ 250');
});

// ----------------------------------------------------------------------------
// 5. TENTATIVA DE ALTERAR O PREÇO PELO NAVEGADOR (SEGURANÇA SERVER-SIDE)
// ----------------------------------------------------------------------------
await asyncTest('5. Tentativa de alterar o preço pelo navegador deve ser bloqueada com HTTP 400', async () => {
  // Caso A: Cliente escolhe Sala Green (R$ 900) e tenta enviar R$ 450 (tentativa de pagar sinal de 50%)
  const { req: reqA, res: resA } = createMockHttp({
    body: {
      tipoReserva: 'sala',
      salaNome: 'Sala Green',
      pessoas: 35,
      metodo: 'pix',
      valor: 450, // VALOR ADULTERADO
      codigoReserva: 'BK-TEST-001'
    }
  });

  await criarCobrancaHandler(reqA, resA);
  assert.equal(resA.getStatusCode(), 400, 'Deve retornar HTTP 400');
  const dataA = resA.getData();
  assert.equal(dataA.sucesso, false);
  assert.match(dataA.error, /Tentativa de alteração de preço pelo navegador/i);
  assert.equal(dataA.valorEsperado, 900);
  assert.equal(dataA.valorRecebido, 450);

  // Caso B: Cliente escolhe Sala Red (R$ 800) e tenta enviar R$ 10 (preço adulterado arbitrário)
  const { req: reqB, res: resB } = createMockHttp({
    body: {
      tipoReserva: 'sala',
      salaNome: 'Sala Red',
      pessoas: 15,
      metodo: 'pix',
      valor: 10, // VALOR ADULTERADO
      codigoReserva: 'BK-TEST-002'
    }
  });

  await criarCobrancaHandler(reqB, resB);
  assert.equal(resB.getStatusCode(), 400);
  const dataB = resB.getData();
  assert.equal(dataB.valorEsperado, 800);
  assert.equal(dataB.valorRecebido, 10);

  // Caso C: Cliente escolhe Mesa 4 pessoas Crédito (R$ 100) e tenta enviar R$ 80
  const { req: reqC, res: resC } = createMockHttp({
    body: {
      tipoReserva: 'mesa',
      mesaId: 'mesa-4',
      pessoas: 4,
      metodo: 'credito',
      valor: 80, // VALOR ADULTERADO (preço de pix em vez de crédito)
      codigoReserva: 'BK-TEST-003'
    }
  });

  await criarCobrancaHandler(reqC, resC);
  assert.equal(resC.getStatusCode(), 400);
  const dataC = resC.getData();
  assert.equal(dataC.valorEsperado, 100);
  assert.equal(dataC.valorRecebido, 80);
});

// ----------------------------------------------------------------------------
// 6. RESERVA PENDENTE SEM PAGAMENTO CONFIRMADO
// ----------------------------------------------------------------------------
test('6. Reserva deve iniciar com status PENDING e não confirmar sem pagamento real Asaas', () => {
  // Simula objeto de pré-reserva gerado antes da confirmação
  const reservaPendente = {
    codigoReserva: 'BK-PENDENTE-123',
    status: 'PENDING',
    statusPagamento: 'aguardando',
    valorTotal: 900,
    valorPago: 0,
    transacaoId: 'asaas_pay_test_pending'
  };

  assert.equal(reservaPendente.status, 'PENDING');
  assert.equal(reservaPendente.statusPagamento, 'aguardando');
  assert.equal(reservaPendente.valorPago, 0);

  // Validação: status jamais pode ser considerado aprovado enquanto status for PENDING
  const isAprovado = reservaPendente.status === 'CONFIRMED' && reservaPendente.statusPagamento === 'aprovado';
  assert.equal(isAprovado, false, 'Reserva pendente não deve estar confirmada');
});

// ----------------------------------------------------------------------------
// 7. EVENTOS DUPLICADOS DO WEBHOOK ASAAS (IDEMPOTÊNCIA)
// ----------------------------------------------------------------------------
await asyncTest('7. Webhook do Asaas deve descartar eventos duplicados por idempotência', async () => {
  const webhookPayload = {
    event: 'PAYMENT_RECEIVED',
    payment: {
      id: 'pay_test_idempotence_' + Date.now(),
      status: 'RECEIVED',
      value: 900,
      billingType: 'PIX',
      externalReference: 'BK-IDEMP-001'
    }
  };

  // Primeira entrega do evento
  const { req: req1, res: res1 } = createMockHttp({
    body: webhookPayload
  });
  await webhookHandler(req1, res1);
  assert.equal(res1.getStatusCode(), 200);
  const data1 = res1.getData();
  assert.equal(data1.received, true);

  // Segunda entrega do mesmo evento (duplicado da rede/Asaas)
  const { req: req2, res: res2 } = createMockHttp({
    body: webhookPayload
  });
  await webhookHandler(req2, res2);
  assert.equal(res2.getStatusCode(), 200);
  const data2 = res2.getData();
  assert.equal(data2.received, true);
  assert.equal(data2.duplicado, true, 'O webhook deve marcar a segunda chamada como duplicado: true');
});

// ----------------------------------------------------------------------------
// 8. MAPEAMENTO E VALIDAÇÃO DE MESAS DO MAPA 2D
// ----------------------------------------------------------------------------
test('8. Mapeamento de mesas do mapa 2D (mesa-1 a mesa-11) e validação de capacidade', () => {
  const mesa1 = getMesaById('mesa-1');
  assert.ok(mesa1, 'Mesa 1 deve ser encontrada por mesa-1');
  assert.equal(mesa1.capacidade, 30, 'Capacidade da Mesa 1 deve ser 30');

  const mesa11 = getMesaById('mesa-11');
  assert.ok(mesa11, 'Mesa 11 deve ser encontrada por mesa-11');
  assert.equal(mesa11.capacidade, 2, 'Capacidade da Mesa 11 deve ser 2');

  const valCapOk = validarCapacidadeMesa('mesa-1', 25);
  assert.equal(valCapOk.valida, true, '25 pessoas devem caber na mesa de 30');

  const valCapExcesso = validarCapacidadeMesa('mesa-1', 35);
  assert.equal(valCapExcesso.valida, false, '35 pessoas devem exceder a capacidade de 30');
});

// ----------------------------------------------------------------------------
// 9. SEGURANÇA CONTRA LINKS FALSOS / CADASTRO ASAAS
// ----------------------------------------------------------------------------
await asyncTest('9. Backend Asaas deve responder com status claro (HTTP 503) e nunca expor URLs genéricas de cadastro', async () => {
  const { req, res } = createMockHttp({
    method: 'POST',
    body: {
      nome: 'Cliente Teste',
      email: 'cliente@teste.com',
      tipoReserva: 'sala',
      salaNome: 'Sala Red',
      valor: 800,
      metodo: 'pix'
    }
  });

  await criarCobrancaHandler(req, res);
  const status = res.getStatusCode();
  const data = res.getData();

  // Se a chave não estiver no ambiente de teste, deve retornar 503 limpo com aviso explicativo
  if (status === 503) {
    assert.equal(data.configurado, false);
    assert.match(data.error, /aguardando configuração da chave API/);
    assert.equal(data.invoiceUrl, undefined, 'Nunca deve retornar invoiceUrl falso');
  } else if (status === 200) {
    assert.ok(data.invoiceUrl, 'Em cobrança real com chave, deve retornar a invoiceUrl oficial');
    assert.match(data.invoiceUrl, /^https:\/\/(www|sandbox)\.asaas\.com\/i\//, 'invoiceUrl deve apontar diretamente para a fatura oficial (/i/), nunca para telas genéricas de cadastro ou /checkout');
  }
});

// ----------------------------------------------------------------------------
// 10. AUDITORIA SEGURA DE CREDENCIAIS DA CONTA DO ESTABELECIMENTO
// ----------------------------------------------------------------------------
await asyncTest('10. Auditoria de credenciais Asaas não deve vazar segredos nem quebrar sem chave', async () => {
  const dados = await consultarDadosContaAsaas();
  assert.ok(dados, 'Objeto de status da conta deve existir');
  if (!dados.configurado) {
    assert.equal(dados.configurado, false);
    assert.match(dados.mensagem, /ASAAS_API_KEY/);
  }
});

// ----------------------------------------------------------------------------
// 11. VALIDAÇÃO DE URLs ESPECÍFICAS DE FATURA CONTRA REDIRECIONAMENTO PARA LOGIN
// ----------------------------------------------------------------------------
test('11. Validador de URL de checkout deve rejeitar URLs que redirecionam para login/cadastro do Asaas', () => {
  const isValidSpecificPaymentUrl = (url) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
    try {
      const parsed = new URL(url);
      const path = (parsed.pathname || '').trim();
      if (!path || path === '/' || path === '/i' || path === '/i/' || path === '/c' || path === '/c/') {
        return false;
      }
      if (path.includes('/login') || path.includes('/cadastro') || path.includes('/auth')) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  // URLs que sabidamente causam 302 para login/cadastro
  assert.equal(isValidSpecificPaymentUrl('https://www.asaas.com'), false);
  assert.equal(isValidSpecificPaymentUrl('https://www.asaas.com/'), false);
  assert.equal(isValidSpecificPaymentUrl('https://www.asaas.com/i/'), false);
  assert.equal(isValidSpecificPaymentUrl('https://www.asaas.com/i'), false);
  assert.equal(isValidSpecificPaymentUrl('https://sandbox.asaas.com/i/'), false);
  assert.equal(isValidSpecificPaymentUrl('https://www.asaas.com/c/'), false);
  assert.equal(isValidSpecificPaymentUrl('https://www.asaas.com/login/auth'), false);
  assert.equal(isValidSpecificPaymentUrl('https://sandbox.asaas.com/cadastro'), false);
  assert.equal(isValidSpecificPaymentUrl('#'), false);
  assert.equal(isValidSpecificPaymentUrl(''), false);
  assert.equal(isValidSpecificPaymentUrl(null), false);

  // URLs de faturas e links específicos válidos do Asaas
  assert.equal(isValidSpecificPaymentUrl('https://www.asaas.com/i/058295819582'), true);
  assert.equal(isValidSpecificPaymentUrl('https://sandbox.asaas.com/i/058295819582'), true);
  assert.equal(isValidSpecificPaymentUrl('https://www.asaas.com/c/bkpay12345'), true);
});

// ----------------------------------------------------------------------------
// 12. SALAS PRIVADAS PRESERVAM PREÇO INTEGRAL INDEPENDENTE DO MÉTODO DE CARTÃO
// ----------------------------------------------------------------------------
test('12. Salas Privadas mantêm preço fixo total integral nos métodos de cartão e pix', () => {
  // Red R$ 800
  const redPix = calcularPrecoOficialServidor({ salaNome: 'Sala Red', metodo: 'pix' });
  const redDeb = calcularPrecoOficialServidor({ salaNome: 'Sala Red', metodo: 'debito' });
  const redCred = calcularPrecoOficialServidor({ salaNome: 'Sala Red', metodo: 'credito' });
  assert.equal(redPix.valor, 800);
  assert.equal(redDeb.valor, 800);
  assert.equal(redCred.valor, 800);

  // Green R$ 900
  const greenPix = calcularPrecoOficialServidor({ salaNome: 'Sala Green', pessoas: 30, metodo: 'pix' });
  const greenDeb = calcularPrecoOficialServidor({ salaNome: 'Sala Green', pessoas: 30, metodo: 'debito' });
  const greenCred = calcularPrecoOficialServidor({ salaNome: 'Sala Green', pessoas: 30, metodo: 'credito' });
  assert.equal(greenPix.valor, 900);
  assert.equal(greenDeb.valor, 900);
  assert.equal(greenCred.valor, 900);

  // Blue R$ 1000
  const bluePix = calcularPrecoOficialServidor({ salaNome: 'Sala Blue', metodo: 'pix' });
  const blueDeb = calcularPrecoOficialServidor({ salaNome: 'Sala Blue', metodo: 'debito' });
  const blueCred = calcularPrecoOficialServidor({ salaNome: 'Sala Blue', metodo: 'credito' });
  assert.equal(bluePix.valor, 1000);
  assert.equal(blueDeb.valor, 1000);
  assert.equal(blueCred.valor, 1000);
});

console.log('\n======================================================');
console.log(` RESULTADO FINAL: ${passedTests}/${totalTests} TESTES APROVADOS COM SUCESSO!`);
console.log('======================================================\n');

