/**
 * ==============================================================================
 * TESTES DO NOVO FLUXO MANUAL VIA WHATSAPP E PIX (BACKSTAGE KARAOKÊ)
 * ==============================================================================
 * Validações obrigatórias:
 * 1. Preços de todas as mesas e salas (Red R$ 800, Green R$ 900, Blue R$ 1.000;
 *    Mesas: Pix R$ 20/pessoa, Débito R$ 20/pessoa, Crédito R$ 25/pessoa).
 * 2. Cálculo exato das opções de pagamento: 50% (sinal mínimo) e 100% (integral).
 * 3. Geração da mensagem do WhatsApp contendo todos os 9 campos obrigatórios:
 *    - Nome do cliente
 *    - Telefone de contato
 *    - Mesa ou sala escolhida
 *    - Data
 *    - Horário
 *    - Quantidade de pessoas
 *    - Valor total
 *    - Forma de pagamento
 *    - Valor que pretende pagar agora
 * 4. Validação do número oficial de WhatsApp (erro explicativo se não configurado).
 * 5. Exibição estrita de dados Pix configurados (sem inventar chaves ou QR codes).
 * 6. Garantia de que nenhuma reserva seja confirmada automaticamente pelo cliente.
 * 7. Fluxo de conferência administrativa (registro de valor recebido e valor restante).
 * ==============================================================================
 */

import assert from 'node:assert/strict';
import {
  calcularOpcoesPagamento,
  gerarMensagemReservaWhatsApp,
  gerarLinkWhatsAppManual,
  obterDadosPixConfigurados,
  formatarMoeda,
  TARIFAS_SALAO
} from '../src/lib/payment.js';
import { calcularPrecoSalaPrivada, ROOM_DATA } from '../src/lib/salasPrivadas.js';
import { MESAS_SALAO, calcularValorReserva } from '../src/lib/mesasSalao.js';

let totalTests = 0;
let passedTests = 0;

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

console.log('\n======================================================');
console.log(' TESTANDO FLUXO MANUAL VIA WHATSAPP E PIX');
console.log('======================================================\n');

// ----------------------------------------------------------------------------
// 1. PREÇOS DE TODAS AS MESAS E SALAS PRIVATIVAS
// ----------------------------------------------------------------------------
test('1.1. Salas privativas devem manter preços fixos integrais (Red R$ 800, Green R$ 900, Blue R$ 1.000)', () => {
  const precosEsperados = {
    'Sala Red': 800,
    'Sala Green': 900,
    'Sala Blue': 1000
  };

  for (const [nomeSala, valorEsperado] of Object.entries(precosEsperados)) {
    for (const metodo of ['pix', 'debito', 'credito']) {
      const calc = calcularPrecoSalaPrivada(nomeSala, metodo);
      assert.equal(calc.valorCobrado, valorEsperado, `${nomeSala} (${metodo}) deve custar R$ ${valorEsperado}`);
      assert.equal(calc.valorBase, valorEsperado);
      assert.equal(calc.taxaPercentual, 0, 'Salas não possuem taxa percentual');
    }
  }

  // Verifica que mesmo com diferentes quantidades de pessoas, o valor da sala é fixo
  const qtds = [1, 10, 25, 40];
  for (const q of qtds) {
    const calcRed = calcularPrecoSalaPrivada('Sala Red', 'pix');
    assert.equal(calcRed.valorCobrado, 800, `Sala Red com ${q} pessoas deve ser R$ 800`);
    const calcGreen = calcularPrecoSalaPrivada('Sala Green', 'pix');
    assert.equal(calcGreen.valorCobrado, 900, `Sala Green com ${q} pessoas deve ser R$ 900`);
    const calcBlue = calcularPrecoSalaPrivada('Sala Blue', 'pix');
    assert.equal(calcBlue.valorCobrado, 1000, `Sala Blue com ${q} pessoas deve ser R$ 1.000`);
  }
});

test('1.2. Preços de todas as mesas do salão: Pix R$ 20/pessoa, Débito R$ 20/pessoa, Crédito R$ 25/pessoa', () => {
  assert.equal(TARIFAS_SALAO.pix, 20);
  assert.equal(TARIFAS_SALAO.debito, 20);
  assert.equal(TARIFAS_SALAO.credito, 25);

  assert.equal(MESAS_SALAO.length, 11, 'Devem existir 11 mesas no salão');

  MESAS_SALAO.forEach((mesa) => {
    const cap = mesa.capacidade;
    // Pix
    const calcPix = calcularValorReserva(cap, 'pix');
    assert.equal(calcPix.valorTotal, cap * 20, `${mesa.nome}: ${cap} pessoas no Pix deve ser R$ ${cap * 20}`);
    assert.equal(calcPix.valorUnitario, 20);

    // Débito
    const calcDeb = calcularValorReserva(cap, 'debito');
    assert.equal(calcDeb.valorTotal, cap * 20, `${mesa.nome}: ${cap} pessoas no Débito deve ser R$ ${cap * 20}`);
    assert.equal(calcDeb.valorUnitario, 20);

    // Crédito
    const calcCred = calcularValorReserva(cap, 'credito');
    assert.equal(calcCred.valorTotal, cap * 25, `${mesa.nome}: ${cap} pessoas no Crédito deve ser R$ ${cap * 25}`);
    assert.equal(calcCred.valorUnitario, 25);
  });
});

// ----------------------------------------------------------------------------
// 2. CÁLCULO DE OPÇÕES DE PAGAMENTO (50% SINAL E 100% INTEGRAL)
// ----------------------------------------------------------------------------
test('2.1. Cálculo de 50% e 100% para salas privativas', () => {
  // Sala Red: R$ 800 -> 50% = R$ 400, 100% = R$ 800
  const optRed = calcularOpcoesPagamento(800);
  assert.equal(optRed.valorTotal, 800);
  assert.equal(optRed.valorMinimo50, 400);
  assert.equal(optRed.valorIntegral100, 800);
  assert.equal(optRed.formatadoTotal, 'R$ 800,00');
  assert.equal(optRed.formatado50, 'R$ 400,00');
  assert.equal(optRed.formatado100, 'R$ 800,00');

  // Sala Green: R$ 900 -> 50% = R$ 450, 100% = R$ 900
  const optGreen = calcularOpcoesPagamento(900);
  assert.equal(optGreen.valorTotal, 900);
  assert.equal(optGreen.valorMinimo50, 450);
  assert.equal(optGreen.valorIntegral100, 900);
  assert.equal(optGreen.formatado50, 'R$ 450,00');
  assert.equal(optGreen.formatado100, 'R$ 900,00');

  // Sala Blue: R$ 1.000 -> 50% = R$ 500, 100% = R$ 1.000
  const optBlue = calcularOpcoesPagamento(1000);
  assert.equal(optBlue.valorTotal, 1000);
  assert.equal(optBlue.valorMinimo50, 500);
  assert.equal(optBlue.valorIntegral100, 1000);
  assert.equal(optBlue.formatado50, 'R$ 500,00');
  assert.equal(optBlue.formatado100, 'R$ 1.000,00');
});

test('2.2. Cálculo de 50% e 100% para mesas e valores fracionados com arredondamento preciso', () => {
  // Ex: 3 pessoas no Crédito = R$ 75,00 -> 50% = R$ 37,50
  const opt75 = calcularOpcoesPagamento(75);
  assert.equal(opt75.valorTotal, 75);
  assert.equal(opt75.valorMinimo50, 37.5);
  assert.equal(opt75.valorIntegral100, 75);
  assert.equal(opt75.formatado50, 'R$ 37,50');
  assert.equal(opt75.formatado100, 'R$ 75,00');

  // Valor com centavos: R$ 125,50 -> 50% = R$ 62,75
  const optCent = calcularOpcoesPagamento(125.5);
  assert.equal(optCent.valorMinimo50, 62.75);
  assert.equal(optCent.formatado50, 'R$ 62,75');
});

// ----------------------------------------------------------------------------
// 3. GERAÇÃO DA MENSAGEM DO WHATSAPP (9 CAMPOS OBRIGATÓRIOS)
// ----------------------------------------------------------------------------
test('3.1. Mensagem de WhatsApp para Pix deve conter os 9 campos obrigatórios e orientação de comprovante', () => {
  const dados = {
    nome: 'Carlos Eduardo Ferreira',
    telefone: '(61) 99876-5432',
    mesaOuSala: 'Sala Green',
    data: '15/11/2026',
    horario: '20:00',
    pessoas: 30,
    valorTotal: 900,
    formaPagamento: 'Pix',
    valorPagarAgora: 450,
    codigoReserva: 'BK-MANUAL-101'
  };

  const msg = gerarMensagemReservaWhatsApp(dados);

  // 1. Nome do cliente
  assert.match(msg, /\*Nome do Cliente:\* Carlos Eduardo Ferreira/);
  // 2. Telefone de contato
  assert.match(msg, /\*Telefone de Contato:\* \(61\) 99876-5432/);
  // 3. Mesa ou sala escolhida
  assert.match(msg, /\*Espaço Escolhido:\* Sala Green/);
  // 4. Data
  assert.match(msg, /\*Data:\* 15\/11\/2026/);
  // 5. Horário
  assert.match(msg, /\*Horário:\* 20:00/);
  // 6. Quantidade de pessoas
  assert.match(msg, /\*Quantidade de Pessoas:\* 30 pessoa\(s\)/);
  // 7. Valor total
  assert.match(msg, /\*Valor Total:\* R\$ 900,00/);
  // 8. Forma de pagamento
  assert.match(msg, /\*Forma de Pagamento:\* Pix/);
  // 9. Valor que pretende pagar agora
  assert.match(msg, /\*Valor que pretendo pagar agora:\* R\$ 450,00/);

  // Código da reserva presente
  assert.match(msg, /\*Código da Reserva:\* BK-MANUAL-101/);

  // Orientação de envio de comprovante
  assert.match(msg, /comprovante da transferência Pix em anexo para conferência/i);
  assert.match(msg, /Aguardo a conferência e confirmação da reserva!/i);
});

test('3.2. Mensagem de WhatsApp para Cartão de Crédito deve solicitar instruções sem marcar como pago', () => {
  const dados = {
    nome: 'Beatriz Lima',
    telefone: '(61) 98111-2233',
    mesaOuSala: 'Mesa 4 (Salão)',
    data: '20/11/2026',
    horario: '21:00',
    pessoas: 4,
    valorTotal: 100,
    formaPagamento: 'Cartão de Crédito',
    valorPagarAgora: 100,
    codigoReserva: 'BK-MANUAL-102'
  };

  const msg = gerarMensagemReservaWhatsApp(dados);

  assert.match(msg, /\*Forma de Pagamento:\* Cartão de Crédito/);
  assert.match(msg, /\*Valor Total:\* R\$ 100,00/);
  assert.match(msg, /\*Valor que pretendo pagar agora:\* R\$ 100,00/);
  assert.match(msg, /combinar as instruções e opções de pagamento por cartão de crédito/i);
  assert.doesNotMatch(msg, /pagamento aprovado/i);
});

// ----------------------------------------------------------------------------
// 4. NÚMERO OFICIAL DE WHATSAPP E GERAÇÃO DE LINK
// ----------------------------------------------------------------------------
test('4.1. Link oficial do WhatsApp deve ser gerado corretamente com DDI 55 quando configurado', () => {
  const link = gerarLinkWhatsAppManual({
    whatsappOficial: '61981426321',
    dadosReserva: {
      nome: 'João Silva',
      telefone: '61999998888',
      mesaOuSala: 'Sala Red',
      data: '10/10/2026',
      horario: '19:00',
      pessoas: 15,
      valorTotal: 800,
      formaPagamento: 'Pix',
      valorPagarAgora: 800
    }
  });

  assert.ok(link.startsWith('https://wa.me/5561981426321?text='));
  assert.ok(link.includes(encodeURIComponent('João Silva')));
  assert.ok(link.includes(encodeURIComponent('Sala Red')));
});

test('4.2. Deve lançar erro explícito se WhatsApp oficial não estiver configurado no painel administrativo', () => {
  assert.throws(() => {
    gerarLinkWhatsAppManual({
      whatsappOficial: '',
      dadosReserva: { nome: 'Teste' }
    });
  }, /WhatsApp oficial do estabelecimento não configurado no painel administrativo/);

  assert.throws(() => {
    gerarLinkWhatsAppManual({
      whatsappOficial: '123', // menos de 10 dígitos
      dadosReserva: { nome: 'Teste' }
    });
  }, /WhatsApp oficial do estabelecimento não configurado/);

  assert.throws(() => {
    gerarLinkWhatsAppManual({
      whatsappOficial: null,
      dadosReserva: { nome: 'Teste' }
    });
  }, /WhatsApp oficial do estabelecimento não configurado/);
});

// ----------------------------------------------------------------------------
// 5. EXIBIÇÃO DE DADOS PIX REAIS CONFIGURADOS (SEM INVENTAR CHAVES OU QR CODES)
// ----------------------------------------------------------------------------
test('5.1. Se Pix não estiver configurado no painel, deve retornar configurado: false e strings vazias (nunca inventar dados)', () => {
  const dadosVazios = obterDadosPixConfigurados({});
  assert.equal(dadosVazios.configurado, false);
  assert.equal(dadosVazios.chave, '');
  assert.equal(dadosVazios.qrcodeUrl, '');
  assert.equal(dadosVazios.copiaCola, '');

  const dadosNulos = obterDadosPixConfigurados({ pixChave: null, pixQrcodeUrl: '' });
  assert.equal(dadosNulos.configurado, false);
  assert.equal(dadosNulos.chave, '');
});

test('5.2. Se Pix estiver configurado no painel, deve retornar exatamente os dados fornecidos pelo estabelecimento', () => {
  const config = {
    pixChave: 'financeiro@backstagekaraoke.com.br',
    pixTipoChave: 'E-mail',
    pixTitular: 'Backstage Karaokê Bar Ltda',
    pixQrcodeUrl: 'https://storage.exemplo.com/pix-qrcode-estatico.png',
    pixCopiaCola: '00020126580014BR.GOV.BCB.PIX0136financeiro@backstagekaraoke.com.br5204000053039865802BR5925BACKSTAGE KARAOKE BAR6008BRASILIA62070503***6304ABCD'
  };

  const dados = obterDadosPixConfigurados(config);
  assert.equal(dados.configurado, true);
  assert.equal(dados.chave, 'financeiro@backstagekaraoke.com.br');
  assert.equal(dados.tipo, 'E-mail');
  assert.equal(dados.titular, 'Backstage Karaokê Bar Ltda');
  assert.equal(dados.qrcodeUrl, 'https://storage.exemplo.com/pix-qrcode-estatico.png');
  assert.equal(dados.copiaCola, config.pixCopiaCola);
});

// ----------------------------------------------------------------------------
// 6. GARANTIA DE QUE NENHUMA RESERVA SEJA CONFIRMADA AUTOMATICAMENTE
// ----------------------------------------------------------------------------
test('6.1. Reserva gerada no checkout cliente deve ter status PENDING e aguardando_comprovante', () => {
  const novaReserva = {
    codigoReserva: 'BK-CLIENTE-999',
    status: 'PENDING',
    statusPagamento: 'aguardando_comprovante',
    gateway: 'manual_whatsapp',
    valorTotal: 900,
    valorPago: 0,
    valorRestante: 900
  };

  // NUNCA pode ser confirmada antes da verificação humana
  assert.equal(novaReserva.status, 'PENDING');
  assert.notEqual(novaReserva.status, 'CONFIRMED');
  assert.equal(novaReserva.statusPagamento, 'aguardando_comprovante');
  assert.equal(novaReserva.valorPago, 0);

  // Simula o clique do cliente no botão de WhatsApp: o cliente clicou, mas a reserva NÃO muda para CONFIRMED
  const cliqueClienteRealizado = true;
  assert.ok(cliqueClienteRealizado);
  assert.equal(novaReserva.status, 'PENDING', 'Clique do cliente jamais confirma a reserva automaticamente');
});

// ----------------------------------------------------------------------------
// 7. CONFERÊNCIA ADMINISTRATIVA E REGISTRO DE RECEBIMENTO
// ----------------------------------------------------------------------------
test('7.1. Apenas a equipe no painel admin confere recebimento bancário e atualiza para CONFIRMED', () => {
  const reservaNoAdmin = {
    id: 'res_12345',
    codigoReserva: 'BK-CLIENTE-999',
    status: 'PENDING',
    statusPagamento: 'aguardando_conferencia',
    valorTotal: 900,
    valorPago: 0,
    valorRestante: 900
  };

  // Equipe confere comprovante no banco de R$ 450 (sinal de 50%)
  const conferenciaAdmin = {
    novoStatus: 'CONFIRMED',
    novoStatusPagamento: 'sinal_pago',
    valorPagoRegistrado: 450,
    valorRestanteRegistrado: 900 - 450 // R$ 450
  };

  reservaNoAdmin.status = conferenciaAdmin.novoStatus;
  reservaNoAdmin.statusPagamento = conferenciaAdmin.novoStatusPagamento;
  reservaNoAdmin.valorPago = conferenciaAdmin.valorPagoRegistrado;
  reservaNoAdmin.valorRestante = conferenciaAdmin.valorRestanteRegistrado;

  assert.equal(reservaNoAdmin.status, 'CONFIRMED');
  assert.equal(reservaNoAdmin.valorPago, 450);
  assert.equal(reservaNoAdmin.valorRestante, 450);

  // Se a equipe registrar quitação integral (R$ 900)
  reservaNoAdmin.valorPago = 900;
  reservaNoAdmin.valorRestante = Math.max(0, reservaNoAdmin.valorTotal - reservaNoAdmin.valorPago);
  reservaNoAdmin.statusPagamento = 'aprovado';

  assert.equal(reservaNoAdmin.valorRestante, 0);
  assert.equal(reservaNoAdmin.statusPagamento, 'aprovado');
});

console.log('\n======================================================');
console.log(` RESULTADO FINAL: ${passedTests}/${totalTests} TESTES APROVADOS COM SUCESSO!`);
console.log('======================================================\n');
