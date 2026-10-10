/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — MODELO DE DADOS E PRECIFICAÇÃO DE SALAS PRIVADAS
 * ==============================================================================
 * Define a especificação oficial de cada uma das salas privadas:
 * 1. Sala Red: Capacidade até 30 pessoas, R$ 800,00 (Preço Único Integral)
 * 2. Sala Green: Capacidade até 40 pessoas, R$ 900,00 (Preço Único Integral)
 * 3. Sala Blue: Capacidade até 50 pessoas, R$ 1.000,00 (Preço Único Integral)
 * 
 * Regra de Negócio Absoluta:
 * O valor da sala privada é fixo e integral para o espaço completo, independentemente
 * do número de convidados (sem cobrança por pessoa, sem multiplicação e sem sinal parcial).
 * ==============================================================================
 */

export const ROOM_DATA = {
  'Sala Blue': {
    name: 'Sala Blue',
    slug: 'sala-blue',
    num: 'Sala 3 • VIP',
    tag: 'blue',
    themeColor: '#00A6FF',
    glowColor: 'rgba(0, 166, 255, 0.45)',
    phrase: 'Você quer me locar? Estou pronta para te proporcionar momentos inesquecíveis!',
    capacidade: 'Até 50 pessoas',
    capacidadeNum: 50,
    precoTotal: 'R$ 1.000,00',
    precoTotalNum: 1000,
    sinal: 'Pagamento Único',
    sinalNum: 1000
  },
  'Sala Red': {
    name: 'Sala Red',
    slug: 'sala-red',
    num: 'Sala 1',
    tag: 'red',
    themeColor: '#FF3366',
    glowColor: 'rgba(255, 51, 102, 0.45)',
    phrase: 'Que bom que me escolheu, eu vou te dar momentos que nenhum outro lugar te daria!',
    capacidade: 'Até 30 pessoas',
    capacidadeNum: 30,
    precoTotal: 'R$ 800,00',
    precoTotalNum: 800,
    sinal: 'Pagamento Único',
    sinalNum: 800
  },
  'Sala Green': {
    name: 'Sala Green',
    slug: 'sala-green',
    num: 'Sala 2',
    tag: 'green',
    themeColor: '#00E699',
    glowColor: 'rgba(0, 230, 153, 0.45)',
    phrase: 'Você fez a escolha perfeita! O meu palco é seu para soltar a voz e viver uma noite épica!',
    capacidade: 'Até 40 pessoas',
    capacidadeNum: 40,
    precoTotal: 'R$ 900,00',
    precoTotalNum: 900,
    sinal: 'Pagamento Único',
    sinalNum: 900
  }
};

/**
 * Calcula a precificação de salas privativas:
 * - Pagamento único integral da sala completa (sem cobrança por pessoa e sem acréscimo de taxas)
 * - Valor nominal normal para todos os métodos (Pix, Débito e Crédito)
 * - Reembolso garantido
 */
export function calcularPrecoSalaPrivada(roomName, metodo = 'pix') {
  const room = ROOM_DATA[roomName] || ROOM_DATA['Sala Red'];
  const valorBase = room ? room.precoTotalNum : 800;
  const cleanMetodo = (metodo || 'pix').toLowerCase();
  const isCredito = (cleanMetodo === 'credito' || cleanMetodo === 'credit_card' || cleanMetodo === 'cartao_credito');
  
  // Salas possuem valor único integral da sala inteira (sem taxa e sem cobrança por pessoa)
  const valorCobrado = valorBase;

  return {
    room,
    nome: room ? room.name : 'Sala Privada',
    metodo: cleanMetodo,
    isCredito,
    valorBase,
    valorCobrado,
    taxaPercentual: 0,
    taxaValor: 0,
    formatadoBase: `R$ ${valorBase.toFixed(2).replace('.', ',')}`,
    formatadoCobrado: `R$ ${valorCobrado.toFixed(2).replace('.', ',')}`
  };
}
