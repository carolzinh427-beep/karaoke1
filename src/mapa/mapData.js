/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — MODELO DE DADOS DA PLANTA / MAPA DO SALÃO PRINCIPAL
 * ==============================================================================
 * Coordenadas SVG nativas: 1000 x 1200
 * Lotação Máxima Oficial: 184 pessoas (soma exata das 11 mesas)
 * 
 * Regras do projeto:
 * - "LOTAÇÃO MÁXIMA 184" não é uma mesa.
 * - NÃO existe mesa em frente ao palco.
 * - Mesa do canto direito: combinação de MESA + SOFÁ com capacidade para 22 pessoas (Mesa 5).
 * - Identificadas internamente como Mesa 1, Mesa 2, ..., Mesa 11.
 * - Suporta status: 'disponivel', 'selecionada', 'reservada', 'indisponivel'.
 * ==============================================================================
 */

export const MAP_DIMENSIONS = {
  width: 1000,
  height: 1200,
  viewBox: '0 0 1000 1200'
};

export const LOTACAO_MAXIMA_SALAO = 184;

/**
 * Catálogo das 11 mesas independentes do Salão Principal
 */
export const TABLES_DATA = [
  {
    id: 'mesa-1',
    number: 1,
    name: 'Mesa 1',
    capacity: 30,
    type: 'comprida',
    x: 160,
    y: 670,
    width: 76,
    height: 220,
    rotation: 0,
    status: 'disponivel',
    location: 'Salão Central / Esquerda',
    description: 'Mesa comprida de alta capacidade com visibilidade do salão e sonorização imersiva.',
    chairsConfig: { left: 14, right: 14, top: 1, bottom: 1 }
  },
  {
    id: 'mesa-2',
    number: 2,
    name: 'Mesa 2',
    capacity: 26,
    type: 'comprida',
    x: 285,
    y: 670,
    width: 76,
    height: 220,
    rotation: 0,
    status: 'disponivel',
    location: 'Salão Central / Centro-Esquerda',
    description: 'Mesa comprida ampla para grupos grandes com circulação livre e acesso ao palco.',
    chairsConfig: { left: 12, right: 12, top: 1, bottom: 1 }
  },
  {
    id: 'mesa-3',
    number: 3,
    name: 'Mesa 3',
    capacity: 26,
    type: 'comprida',
    x: 410,
    y: 670,
    width: 76,
    height: 220,
    rotation: 0,
    status: 'disponivel',
    location: 'Salão Central / Centro',
    description: 'Mesa comprida central com iluminação cênica de neon e visão privilegiada.',
    chairsConfig: { left: 12, right: 12, top: 1, bottom: 1 }
  },
  {
    id: 'mesa-4',
    number: 4,
    name: 'Mesa 4',
    capacity: 20,
    type: 'comprida',
    x: 585,
    y: 670,
    width: 76,
    height: 220,
    rotation: 0,
    status: 'disponivel',
    location: 'Salão Central / Centro-Direita',
    description: 'Mesa comprida para 20 pessoas posicionada estrategicamente no centro vibrante.',
    chairsConfig: { left: 9, right: 9, top: 1, bottom: 1 }
  },
  {
    id: 'mesa-5',
    number: 5,
    name: 'Mesa 5',
    capacity: 22,
    type: 'sofa_mesa',
    x: 775,
    y: 690,
    width: 100,
    height: 260,
    rotation: 0,
    status: 'disponivel',
    location: 'Corredor do Bar / Canto Direito (Mesa + Sofá)',
    description: 'Combinação exclusiva de mesa comprida com sofá integrado de alta capacidade para 22 pessoas.',
    chairsConfig: { left: 10, right: 0, top: 1, bottom: 1, hasSofaBack: true }
  },
  {
    id: 'mesa-6',
    number: 6,
    name: 'Mesa 6',
    capacity: 12,
    type: 'comprida',
    x: 585,
    y: 310,
    width: 72,
    height: 150,
    rotation: 0,
    status: 'disponivel',
    location: 'Superior / Frente à Gabine do DJ',
    description: 'Posicionada estrategicamente em frente à cabine do DJ para curtir o som da noite.',
    chairsConfig: { left: 5, right: 5, top: 1, bottom: 1 }
  },
  {
    id: 'mesa-7',
    number: 7,
    name: 'Mesa 7',
    capacity: 16,
    type: 'comprida',
    x: 755,
    y: 310,
    width: 72,
    height: 160,
    rotation: 0,
    status: 'disponivel',
    location: 'Superior / Próximo ao Espaço Xadrez',
    description: 'Mesa comprida superior com visão panorâmica de todo o salão e iluminação de neon.',
    chairsConfig: { left: 7, right: 7, top: 1, bottom: 1 }
  },
  {
    id: 'mesa-8',
    number: 8,
    name: 'Mesa 8',
    capacity: 14,
    type: 'lounge_horizontal',
    x: 370,
    y: 975,
    width: 140,
    height: 80,
    rotation: 0,
    status: 'disponivel',
    location: 'Inferior Central / Área do Sofá',
    description: 'Mesa confortável com assentos estofados e ambiente aconchegante para grupos de até 14 pessoas.',
    chairsConfig: { top: 4, bottom: 4, left: 3, right: 3, hasEnclosingSofa: true }
  },
  {
    id: 'mesa-9',
    number: 9,
    name: 'Mesa 9',
    capacity: 12,
    type: 'comprida',
    x: 585,
    y: 975,
    width: 72,
    height: 160,
    rotation: 0,
    status: 'disponivel',
    location: 'Inferior / Próxima à Entrada Principal',
    description: 'Mesa prática e acessível próxima à recepção e entrada do salão com circulação privilegiada.',
    chairsConfig: { left: 5, right: 5, top: 1, bottom: 1 }
  },
  {
    id: 'mesa-10',
    number: 10,
    name: 'Mesa 10',
    capacity: 4,
    type: 'bistro',
    x: 820,
    y: 475,
    width: 60,
    height: 60,
    rotation: 0,
    status: 'disponivel',
    location: 'Área do Bar / Bistrô Alto',
    description: 'Mesa alta estilo bistrô com banquetas para encontros rápidos ou grupos de até 4 amigos.',
    chairsConfig: { isRound: true, count: 4 }
  },
  {
    id: 'mesa-11',
    number: 11,
    name: 'Mesa 11',
    capacity: 2,
    type: 'xadrez',
    x: 775,
    y: 135,
    width: 64,
    height: 64,
    rotation: 0,
    status: 'disponivel',
    location: 'Espaço Temático Xadrez (Superior Direito)',
    description: 'Mesa intimista de xadrez para 2 pessoas que buscam diversão estratégica e coquetéis.',
    chairsConfig: { left: 1, right: 1, isChess: true }
  }
];

/**
 * Estruturas arquitetônicas do salão
 */
export const ARCHITECTURAL_ELEMENTS = {
  stage: {
    name: 'Palco Salão Principal',
    path: 'M 40,40 L 330,40 L 330,160 Q 250,280 40,280 Z',
    labelX: 160,
    labelY: 150,
    neonColor: '#A855F7',
    hasStairs: true
  },
  djBooth: {
    name: 'GABINE DJ',
    x: 480,
    y: 40,
    width: 210,
    height: 140,
    neonColor: '#00F0FF'
  },
  xadrezRoom: {
    name: 'XADREZ',
    x: 700,
    y: 40,
    width: 260,
    height: 155,
    neonColor: '#EAB308'
  },
  bar: {
    name: 'BAR',
    x: 885,
    y: 240,
    width: 75,
    height: 300,
    stools: 4,
    neonColor: '#00F0FF'
  },
  entrance: {
    name: 'ENTRADA',
    x: 680,
    y: 1110,
    width: 140,
    height: 50,
    neonColor: '#00F0FF'
  },
  ledCross: {
    horizontal: { x1: 220, y1: 475, x2: 730, y2: 475 },
    vertical: { x1: 500, y1: 300, x2: 500, y2: 650 },
    neonColor: '#00F0FF'
  },
  sofas: [
    {
      id: 'sofa-lateral-esquerdo',
      name: 'Sofá Lateral Esquerdo',
      x: 45,
      y: 320,
      width: 48,
      height: 420,
      orientation: 'vertical'
    },
    {
      id: 'sofa-lounge-inferior-esq',
      name: 'Sofá Lounge Canto Inferior',
      x: 45,
      y: 770,
      width: 190,
      height: 140,
      orientation: 'lounge_l'
    },
    {
      id: 'sofa-enclosure-mesa-8',
      name: 'Sofá Mesa 8',
      x: 280,
      y: 935,
      width: 230,
      height: 150,
      orientation: 'u_shape'
    },
    {
      id: 'sofa-lateral-direito',
      name: 'Sofá Lateral Direito',
      x: 907,
      y: 570,
      width: 53,
      height: 380,
      orientation: 'vertical'
    }
  ]
};

export function getTableById(id) {
  return TABLES_DATA.find(t => t.id === id) || null;
}

export function getTotalCapacity() {
  return TABLES_DATA.reduce((acc, t) => acc + t.capacity, 0);
}
