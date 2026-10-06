/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — CATÁLOGO DE MESAS DO SALÃO PRINCIPAL
 * ==============================================================================
 * Lotação Máxima Oficial: 184 pessoas.
 * Os números no mapa representam a CAPACIDADE MÁXIMA de cada mesa, e não o número dela.
 * Soma das capacidades: 30 + 26 + 22 + 20 + 26 + 16 + 14 + 12 + 12 + 4 + 2 = 184 pessoas.
 * ==============================================================================
 */

export const LOTACAO_MAXIMA_SALAO = 184;

export const TAXAS_POR_PESSOA = {
  pix: 20,
  debito: 20,
  credito: 25,
};

export const MESAS_SALAO = [
  {
    id: 'mesa-30',
    capacidade: 30,
    nomeExibicao: 'Mesa para 30 pessoas',
    rotuloCapacidade: 'Até 30 pessoas',
    tipo: 'comprida',
    comprida: true,
    localizacao: 'Frente ao Palco / Lado Esquerdo',
    descricao: 'Mesa comprida de alta capacidade, com excelente visão do palco principal e sonorização imersiva.',
    cordMap: { top: 50.3, left: 12.0, width: 9.2, height: 17.6 }
  },
  {
    id: 'mesa-26-a',
    capacidade: 26,
    nomeExibicao: 'Mesa para 26 pessoas',
    rotuloCapacidade: 'Até 26 pessoas',
    tipo: 'comprida',
    comprida: true,
    localizacao: 'Salão Central / Esquerda',
    descricao: 'Mesa comprida ampla para grupos grandes com visibilidade frontal do palco e circulação livre.',
    cordMap: { top: 50.3, left: 24.0, width: 9.2, height: 17.6 }
  },
  {
    id: 'mesa-22',
    capacidade: 22,
    nomeExibicao: 'Mesa para 22 pessoas',
    rotuloCapacidade: 'Até 22 pessoas',
    tipo: 'comprida_esticada',
    comprida: true,
    esticada: true,
    localizacao: 'Salão Central / Centro-Esquerda',
    descricao: 'Mesa comprida e esticada com excelente posicionamento sob a iluminação cênica de neon.',
    cordMap: { top: 50.3, left: 36.4, width: 9.2, height: 17.6 }
  },
  {
    id: 'mesa-20',
    capacidade: 20,
    nomeExibicao: 'Mesa para 20 pessoas',
    rotuloCapacidade: 'Até 20 pessoas',
    tipo: 'comprida',
    comprida: true,
    localizacao: 'Salão Central / Centro',
    descricao: 'Mesa comprida para 20 pessoas posicionada estrategicamente no centro vibrante do salão.',
    cordMap: { top: 50.3, left: 53.8, width: 9.2, height: 17.6 }
  },
  {
    id: 'mesa-26-bar',
    capacidade: 26,
    nomeExibicao: 'Mesa para 26 pessoas (Bar)',
    rotuloCapacidade: 'Até 26 pessoas',
    tipo: 'comprida',
    comprida: true,
    localizacao: 'Corredor do Bar / Direita',
    descricao: 'Mesa comprida estendida posicionada em frente ao bar com acesso rápido a drinks e chopps.',
    cordMap: { top: 50.0, left: 76.0, width: 7.9, height: 28.7 }
  },
  {
    id: 'mesa-16',
    capacidade: 16,
    nomeExibicao: 'Mesa para 16 pessoas',
    rotuloCapacidade: 'Até 16 pessoas',
    tipo: 'comprida',
    comprida: true,
    localizacao: 'Superior / Próximo ao Bar',
    descricao: 'Mesa comprida superior com visão panorâmica de todo o salão e iluminação de neon.',
    cordMap: { top: 21.5, left: 70.1, width: 8.4, height: 14.2 }
  },
  {
    id: 'mesa-14',
    capacidade: 14,
    nomeExibicao: 'Mesa para 14 pessoas',
    rotuloCapacidade: 'Até 14 pessoas',
    tipo: 'horizontal',
    comprida: false,
    localizacao: 'Inferior Central / Área do Sofá',
    descricao: 'Mesa confortável com assentos estofados e ambiente aconchegante para grupos de até 14 pessoas.',
    cordMap: { top: 72.5, left: 30.8, width: 15.3, height: 9.1 }
  },
  {
    id: 'mesa-12-dj',
    capacidade: 12,
    nomeExibicao: 'Mesa para 12 pessoas (DJ)',
    rotuloCapacidade: 'Até 12 pessoas',
    tipo: 'comprida',
    comprida: true,
    localizacao: 'Superior / Frente à Gabine do DJ',
    descricao: 'Posicionada estrategicamente em frente à cabine do DJ para curtir o som da noite.',
    cordMap: { top: 21.5, left: 55.6, width: 8.4, height: 14.2 }
  },
  {
    id: 'mesa-12-entrada',
    capacidade: 12,
    nomeExibicao: 'Mesa para 12 pessoas (Entrada)',
    rotuloCapacidade: 'Até 12 pessoas',
    tipo: 'comprida',
    comprida: true,
    localizacao: 'Inferior / Próxima à Entrada Principal',
    descricao: 'Mesa prática e acessível próxima à recepção e entrada do salão com circulação privilegiada.',
    cordMap: { top: 71.8, left: 55.6, width: 8.4, height: 15.6 }
  },
  {
    id: 'mesa-bistro-4',
    capacidade: 4,
    nomeExibicao: 'Mesa Bistrô para 4 pessoas',
    rotuloCapacidade: 'Até 4 pessoas',
    tipo: 'bistro',
    comprida: false,
    localizacao: 'Área do Bar / Bistrô Alto',
    descricao: 'Mesa alta estilo bistrô com banquetas para encontros rápidos ou grupos de até 4 amigos.',
    cordMap: { top: 39.8, left: 76.1, width: 9.4, height: 8.0 }
  },
  {
    id: 'mesa-xadrez-2',
    capacidade: 2,
    nomeExibicao: 'Mesa Xadrez para 2 pessoas',
    rotuloCapacidade: 'Até 2 pessoas',
    tipo: 'jogos',
    comprida: false,
    localizacao: 'Espaço Temático Xadrez (Superior Direito)',
    descricao: 'Mesa intimista de xadrez para 2 pessoas que buscam diversão estratégica e coquetéis.',
    cordMap: { top: 12.1, left: 66.7, width: 14.8, height: 7.4 }
  }
];

/**
 * Valida se a quantidade de pessoas solicitada cabe na mesa selecionada
 */
export function validarCapacidadeMesa(mesaId, quantidadePessoas) {
  const mesa = MESAS_SALAO.find(m => m.id === mesaId);
  const qtd = parseInt(quantidadePessoas, 10);

  if (!mesa) {
    return {
      valida: false,
      mensagem: 'Mesa não encontrada no sistema. Por favor, selecione uma mesa no mapa.'
    };
  }

  if (isNaN(qtd) || qtd <= 0) {
    return {
      valida: false,
      mensagem: 'Informe uma quantidade válida de pessoas (mínimo 1).'
    };
  }

  if (qtd > mesa.capacidade) {
    const diferenca = qtd - mesa.capacidade;
    return {
      valida: false,
      maximo: mesa.capacidade,
      solicitado: qtd,
      excesso: diferenca,
      mesa,
      mensagem: `Esta mesa acomoda no máximo ${mesa.capacidade} pessoas. Para o seu grupo de ${qtd} pessoas (excesso de ${diferenca}), por favor ajuste o número ou selecione uma mesa maior no mapa.`
    };
  }

  return {
    valida: true,
    maximo: mesa.capacidade,
    solicitado: qtd,
    mesa,
    mensagem: `Quantidade aprovada! Esta mesa acomoda confortavelmente até ${mesa.capacidade} pessoas.`
  };
}

/**
 * Calcula o valor total conforme a forma de pagamento:
 * - Pix: R$ 20 por pessoa
 * - Débito: R$ 20 por pessoa
 * - Crédito: R$ 25 por pessoa
 */
export function calcularValorReserva(quantidadePessoas, metodoPagamento = 'pix') {
  const qtd = Math.max(1, parseInt(quantidadePessoas, 10) || 1);
  const metodo = (metodoPagamento || 'pix').toLowerCase();
  const valorUnitario = (metodo === 'credito' || metodo === 'cartao_credito') ? TAXAS_POR_PESSOA.credito : TAXAS_POR_PESSOA.pix;
  const valorTotal = qtd * valorUnitario;

  return {
    quantidadePessoas: qtd,
    metodoPagamento: metodo,
    valorUnitario,
    valorTotal,
    formatadoTotal: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`,
    formatadoUnitario: `R$ ${valorUnitario.toFixed(2).replace('.', ',')}`
  };
}

/**
 * Busca uma mesa pelo identificador
 */
export function getMesaById(id) {
  return MESAS_SALAO.find(m => m.id === id) || null;
}
