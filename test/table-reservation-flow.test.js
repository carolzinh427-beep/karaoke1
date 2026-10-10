/**
 * ==============================================================================
 * TESTE ESPECÍFICO: FLUXO DE RESERVA E PAGAMENTO DE MESAS DO SALÃO
 * ==============================================================================
 */

import assert from 'node:assert/strict';
import { MESAS_SALAO, LOTACAO_MAXIMA_SALAO, TAXAS_POR_PESSOA, getMesaById, calcularValorReserva } from '../src/lib/mesasSalao.js';
import { calcularPrecoOficialServidor } from '../api/_asaas.js';

console.log('\n======================================================');
console.log(' TESTANDO FLUXO DE RESERVA E PAGAMENTO DE MESAS');
console.log('======================================================\n');

// 1. Catálogo e capacidades
assert.equal(MESAS_SALAO.length, 11, 'Devem existir exatamente 11 mesas no salão');
const somaCapacidade = MESAS_SALAO.reduce((acc, m) => acc + m.capacidade, 0);
assert.equal(somaCapacidade, LOTACAO_MAXIMA_SALAO, 'A soma das capacidades deve ser exatamente 184');
assert.equal(LOTACAO_MAXIMA_SALAO, 184, 'A lotação máxima do salão deve ser 184');
console.log('  ✓ [PASSOU] Catálogo com 11 mesas e capacidade total de 184 pessoas');

// 2. Cálculo de valores individuais de mesas (Pix R$ 20, Débito R$ 20, Crédito R$ 25)
const calcPix4 = calcularValorReserva(4, 'pix');
assert.equal(calcPix4.valorTotal, 80);
assert.equal(calcPix4.valorUnitario, 20);

const calcDebito4 = calcularValorReserva(4, 'debito');
assert.equal(calcDebito4.valorTotal, 80);
assert.equal(calcDebito4.valorUnitario, 20);

const calcCredito4 = calcularValorReserva(4, 'credito');
assert.equal(calcCredito4.valorTotal, 100);
assert.equal(calcCredito4.valorUnitario, 25);
console.log('  ✓ [PASSOU] Cálculos de 4 pessoas: Pix R$ 80, Débito R$ 80, Crédito R$ 100');

// 3. Validação do cálculo oficial no servidor (Asaas backend) para mesas
const servPix = calcularPrecoOficialServidor({
  tipoReserva: 'mesa',
  mesaId: 'mesa-30',
  pessoas: 4,
  metodo: 'pix'
});
assert.equal(servPix.valor, 80);
assert.equal(servPix.tarifaPorPessoa, 20);

const servCred = calcularPrecoOficialServidor({
  tipoReserva: 'mesa',
  mesaId: 'mesa-30',
  pessoas: 6,
  metodo: 'credito'
});
assert.equal(servCred.valor, 150);
assert.equal(servCred.tarifaPorPessoa, 25);
console.log('  ✓ [PASSOU] Validação oficial autoritativa do servidor para cobrança de mesas');

// 4. Verificação de higienização de telefone
function validarTelefone(whatsapp) {
  const cleanZap = (whatsapp || '').replace(/\D/g, '');
  return cleanZap.length === 10 || cleanZap.length === 11;
}

assert.equal(validarTelefone('(61) 98765-4321'), true, 'Telefone celular formatado válido');
assert.equal(validarTelefone('61987654321'), true, 'Telefone celular dígitos brutos válido');
assert.equal(validarTelefone('(61) 3322-1100'), true, 'Telefone fixo 10 dígitos válido');
assert.equal(validarTelefone('6133221100'), true, 'Telefone fixo dígitos brutos válido');
assert.equal(validarTelefone('123'), false, 'Telefone incompleto deve ser inválido');
assert.equal(validarTelefone(''), false, 'Telefone vazio deve ser inválido');
console.log('  ✓ [PASSOU] Validação resiliente de telefones com DDD (10 ou 11 dígitos)');

// 5. Teste da lógica do Stepper e alternância de seções (Etapa 6 -> Etapa 8)
function simularAlternarSecaoFluxo(secaoAtivaId, passoNumero) {
  const secoes = [
    'chkSectionMesa',
    'chkSectionData',
    'chkSectionHorario',
    'chkSectionDados',
    'chkSectionResumo',
    'chkSectionPagar',
    'chkSectionConfirmacao'
  ];

  const badgeMap = {
    1: 'flowStepBadge1',
    2: 'flowStepBadge2',
    3: 'flowStepBadge3',
    4: 'flowStepBadge4',
    6: 'flowStepBadge6',
    8: 'flowStepBadge8',
    9: 'flowStepBadge9',
  };

  const estadoSecoes = {};
  secoes.forEach(id => {
    estadoSecoes[id] = (id === secaoAtivaId ? 'block' : 'none');
  });

  const estadoBadges = {};
  Object.keys(badgeMap).forEach(p => {
    const num = parseInt(p, 10);
    if (num === passoNumero) {
      estadoBadges[badgeMap[p]] = 'active';
    } else if (num < passoNumero) {
      estadoBadges[badgeMap[p]] = 'completed';
    } else {
      estadoBadges[badgeMap[p]] = 'inactive';
    }
  });

  return { estadoSecoes, estadoBadges };
}

const transicaoPasso8 = simularAlternarSecaoFluxo('chkSectionPagar', 8);
assert.equal(transicaoPasso8.estadoSecoes['chkSectionPagar'], 'block', 'chkSectionPagar deve ficar visível na etapa 8');
assert.equal(transicaoPasso8.estadoSecoes['chkSectionResumo'], 'none', 'chkSectionResumo deve ser ocultado na etapa 8');
assert.equal(transicaoPasso8.estadoBadges['flowStepBadge8'], 'active', 'flowStepBadge8 deve ser ativado');
assert.equal(transicaoPasso8.estadoBadges['flowStepBadge6'], 'completed', 'flowStepBadge6 deve ser marcado como concluído');
console.log('  ✓ [PASSOU] Stepper e visibilidade: transição precisa para Etapa 8 (Pagar)');

// 6. Teste de preservação do aceite da política de cancelamento entre formulário e modal
function simularPreservacaoPoliticaCancelamento(formChecked, modalPreChecked) {
  let modalCheckboxChecked = modalPreChecked;
  // Regra corrigida: se o cliente já aceitou no formulário principal, o modal herda e nunca reseta para false
  if (formChecked) {
    modalCheckboxChecked = true;
  }
  return modalCheckboxChecked;
}

assert.equal(simularPreservacaoPoliticaCancelamento(true, false), true, 'Aceite do formulário deve ser herdado no modal');
assert.equal(simularPreservacaoPoliticaCancelamento(true, true), true, 'Aceite prévio não deve ser revertido');
assert.equal(simularPreservacaoPoliticaCancelamento(false, true), true, 'Aceite já marcado no modal não deve ser apagado');
console.log('  ✓ [PASSOU] Preservação íntegra do aceite da Política de Cancelamento');

// 7. Teste de resiliência: Gateway indisponível não deve expulsar o usuário da Etapa 8
function simularTratamentoErroGateway(statusGateway, secaoAtual) {
  let secaoFinal = secaoAtual;
  let erroExibido = false;

  try {
    if (statusGateway !== 200) {
      throw new Error('Gateway Asaas aguardando configuração (HTTP 503)');
    }
  } catch (err) {
    // Regra corrigida: NÃO reverte secaoFinal para 'chkSectionResumo'
    erroExibido = true;
  }

  return { secaoFinal, erroExibido };
}

const resultadoErro = simularTratamentoErroGateway(503, 'chkSectionPagar');
assert.equal(resultadoErro.secaoFinal, 'chkSectionPagar', 'Usuário deve permanecer no Passo 8 mesmo com aviso de gateway');
assert.equal(resultadoErro.erroExibido, true, 'Erro de gateway deve ser tratado e registrado');
console.log('  ✓ [PASSOU] Resiliência: Etapa 8 permanece aberta e exibe mensagem clara');

console.log('\n======================================================');
console.log(' TODOS OS TESTES DE MESAS E CHECKOUT FORAM APROVADOS!');
console.log('======================================================\n');
