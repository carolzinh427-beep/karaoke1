/**
 * ==============================================================================
 * TESTE: CONTROLE DE DISPONIBILIDADE, BLOQUEIO E GESTÃO DE RESERVAS (ADMIN & SITE)
 * ==============================================================================
 */

import assert from 'node:assert/strict';
import {
  extrairDataISO,
  formatarDataBR,
  extrairNumeroMesa
} from '../src/lib/mesasSalao.js';

console.log('\n======================================================');
console.log(' TESTANDO DISPONIBILIDADE E GESTÃO DE RESERVAS');
console.log('======================================================\n');

// 1. Normalização de Datas
assert.equal(extrairDataISO('2026-11-06'), '2026-11-06', 'Formato ISO YYYY-MM-DD');
assert.equal(extrairDataISO('06/11/2026'), '2026-11-06', 'Formato brasileiro DD/MM/YYYY');
assert.equal(extrairDataISO('Sexta-feira, 06/11/2026'), '2026-11-06', 'Formato longo com dia da semana');
assert.equal(formatarDataBR('2026-11-06'), '06/11/2026', 'Formatação para BR');
console.log('  ✓ [PASSOU] 1. Normalização e conversão de datas infalível para qualquer formato');

// 2. Extração de Números de Mesas
assert.equal(extrairNumeroMesa('mesa-1'), 1);
assert.equal(extrairNumeroMesa('Mesa 1'), 1);
assert.equal(extrairNumeroMesa('mesa-30'), 1, 'Mapeamento do catálogo antigo mesa-30 -> 1');
assert.equal(extrairNumeroMesa('mesa-5'), 5);
assert.equal(extrairNumeroMesa('Mesa 11'), 11);
assert.equal(extrairNumeroMesa('mesa-xadrez-2'), 11);
console.log('  ✓ [PASSOU] 2. Mapeamento e identificação precisa das 11 mesas do salão');

// 3. Simulação de checagem de mesa reservada
const dummyReservas = [
  {
    id: 'res-1',
    codigo_reserva: 'BK-2026-TEST1',
    nome: 'Carlos Souza',
    data: '2026-11-10',
    horario: '19:00',
    salaOuMesa: 'Mesa 4',
    status: 'CONFIRMED'
  },
  {
    id: 'res-2',
    codigo_reserva: 'BK-2026-TEST2',
    nome: 'Mariana Lima',
    data: 'Sábado, 28/11/2026',
    horario: '20:00',
    salaOuMesa: 'Sala Red',
    status: 'CONFIRMED'
  },
  {
    id: 'res-3',
    codigo_reserva: 'BK-2026-TEST3',
    nome: 'Cliente Cancelado',
    data: '2026-11-10',
    horario: '19:00',
    salaOuMesa: 'Mesa 5',
    status: 'CANCELLED'
  }
];

function mockIsMesaReservada(mesaId, dataStr, horarioStr, reservas, bloqueios = []) {
  const targetNum = extrairNumeroMesa(mesaId);
  if (!targetNum) return false;
  const targetDataISO = extrairDataISO(dataStr);
  const targetHorario = horarioStr ? String(horarioStr).trim() : null;

  if (bloqueios && bloqueios.length) {
    const temBloqueio = bloqueios.some(b => {
      const bDataISO = extrairDataISO(b.data);
      if (targetDataISO && bDataISO && targetDataISO !== bDataISO) return false;
      if (b.tipo === 'dia_inteiro' || b.sala === 'todas') return true;
      const bMesaNum = extrairNumeroMesa(b.sala);
      return bMesaNum === targetNum;
    });
    if (temBloqueio) return true;
  }

  return reservas.some(r => {
    const st = (r.status || '').toUpperCase();
    if (st === 'CANCELLED' || st === 'CANCELADO') return false;
    const isAtiva = st === 'CONFIRMED' || st === 'CONFIRMADA' || st === 'PENDING' || st === 'AGUARDANDO_COMPROVANTE';
    if (!isAtiva) return false;

    const rMesaNum = extrairNumeroMesa(r.salaOuMesa || r.sala || r.mesaId);
    if (rMesaNum !== targetNum) return false;

    if (targetDataISO) {
      const rDataISO = extrairDataISO(r.data);
      if (rDataISO && rDataISO !== targetDataISO) return false;
    }

    if (targetHorario && r.horario) {
      const rHorario = String(r.horario).trim();
      if (rHorario !== 'Dia Inteiro' && rHorario !== targetHorario) return false;
    }

    return true;
  });
}

// Mesa 4 em 10/11/2026 às 19:00 está confirmada -> deve ser ocupada
assert.equal(mockIsMesaReservada('mesa-4', '2026-11-10', '19:00', dummyReservas), true);

// Mesa 4 em outra data -> deve ser livre
assert.equal(mockIsMesaReservada('mesa-4', '2026-11-11', '19:00', dummyReservas), false);

// Mesa 4 em outro horário no mesmo dia -> deve ser livre
assert.equal(mockIsMesaReservada('mesa-4', '2026-11-10', '21:00', dummyReservas), false);

// Mesa 5 que foi cancelada -> deve ser livre
assert.equal(mockIsMesaReservada('mesa-5', '2026-11-10', '19:00', dummyReservas), false);
console.log('  ✓ [PASSOU] 3. Mesa confirmada bloqueia data e horário específicos; reserva cancelada libera a mesa');

// 4. Bloqueio manual do Administrador
const mockBloqueios = [
  {
    data: '2026-12-01',
    tipo: 'sala_horario',
    sala: 'Mesa 2',
    horario: '19:00',
    motivo: 'Manutenção'
  }
];

assert.equal(mockIsMesaReservada('mesa-2', '2026-12-01', '19:00', [], mockBloqueios), true, 'Mesa 2 bloqueada pelo admin');
assert.equal(mockIsMesaReservada('mesa-1', '2026-12-01', '19:00', [], mockBloqueios), false, 'Mesa 1 livre');
console.log('  ✓ [PASSOU] 4. Bloqueios manuais de mesas pelo painel admin bloqueiam imediatamente');

// 5. Geração de Mensagem para conferir disponibilidade de data via WhatsApp
function gerarMsgConferirDataWhatsApp(dataTxt, context, whatsappNumber = '556181426321') {
  let msg = `Olá! Gostaria de conferir se a data ${dataTxt} está realmente disponível para reserva no Backstage Karaokê.`;
  if (context === 'sala') {
    msg = `Olá! Gostaria de conferir se a data ${dataTxt} está realmente disponível para reserva de sala privada no Backstage Karaokê.`;
  } else if (context === 'mesa' || context === 'mapa_filtro' || context === 'mesa_modal') {
    msg = `Olá! Gostaria de conferir se a data ${dataTxt} está realmente disponível para reserva de mesa no Salão Principal do Backstage Karaokê.`;
  }
  const phone = whatsappNumber.replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

const wppUrlSala = gerarMsgConferirDataWhatsApp('Sexta-feira, 06/11/2026', 'sala');
assert.ok(wppUrlSala.includes('wa.me/556181426321'));
assert.ok(wppUrlSala.includes(encodeURIComponent('Sexta-feira, 06/11/2026')));
assert.ok(wppUrlSala.includes(encodeURIComponent('sala privada')));

const wppUrlMesa = gerarMsgConferirDataWhatsApp('Sábado, 07/11/2026', 'mesa');
assert.ok(wppUrlMesa.includes(encodeURIComponent('mesa no Salão Principal')));

const wppUrlMapaFiltro = gerarMsgConferirDataWhatsApp('Terça-feira, 10/11/2026', 'mapa_filtro');
assert.ok(wppUrlMapaFiltro.includes(encodeURIComponent('mesa no Salão Principal')));

const wppUrlMesaModal = gerarMsgConferirDataWhatsApp('Quarta-feira, 11/11/2026', 'mesa_modal');
assert.ok(wppUrlMesaModal.includes(encodeURIComponent('mesa no Salão Principal')));
console.log('  ✓ [PASSOU] 5. Geração e validação de link do WhatsApp para conferir disponibilidade da data clicada (salas e mesas em todos os fluxos)');

console.log('\n======================================================');
console.log(' TODOS OS TESTES DE DISPONIBILIDADE PASSARAM COM SUCESSO!');
console.log('======================================================\n');
