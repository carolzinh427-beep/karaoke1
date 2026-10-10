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

console.log('\n======================================================');
console.log(' TODOS OS TESTES DE MESAS FORAM APROVADOS!');
console.log('======================================================\n');
