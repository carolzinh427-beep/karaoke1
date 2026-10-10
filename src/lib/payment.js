/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — CAMADA AGNOSTICA DE PAGAMENTO SEGURO (INTEGRAÇÃO ASAAS)
 * ==============================================================================
 * Em estrita conformidade com PCI-DSS e LGPD:
 * - NENHUM dado de cartão de crédito (número, CVV, validade) trafega ou é salvo no Supabase.
 * - Integração preparada para o gateway Asaas (Pix, Débito e Crédito).
 * - Armazena no banco apenas identificadores de transação, status e comprovantes.
 * ==============================================================================
 */

export const PAYMENT_METHODS = {
  PIX: 'pix',
  DEBITO: 'debito',
  CREDITO: 'credito',
  // Retrocompatibilidade
  CREDIT_CARD: 'credito'
};

export const PAYMENT_STATUS = {
  PENDING: 'aguardando',
  APPROVED: 'aprovado',
  REJECTED: 'recusado',
  REFUNDED: 'estornado',
};

export const TARIFAS_SALAO = {
  pix: 20,
  debito: 20,
  credito: 25,
};

/**
 * Formata um valor numérico para o padrão de moeda brasileiro (R$ 0,00).
 */
export function formatarMoeda(valor) {
  const num = Number(valor) || 0;
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Calcula as opções de pagamento da reserva:
 * - Sinal mínimo obrigatório de 50%
 * - Pagamento integral de 100%
 */
export function calcularOpcoesPagamento(valorTotal) {
  const total = Number(valorTotal) || 0;
  const minimo50 = Math.round((total * 0.5) * 100) / 100;
  const integral100 = total;

  return {
    valorTotal: total,
    valorMinimo50: minimo50,
    valorIntegral100: integral100,
    formatadoTotal: formatarMoeda(total),
    formatado50: formatarMoeda(minimo50),
    formatado100: formatarMoeda(integral100)
  };
}

/**
 * Monta a mensagem pré-preenchida oficial para o WhatsApp com os dados da reserva.
 *
 * Contém obrigatoriamente todos os dados da reserva:
 * 1. Nome do cliente
 * 2. Telefone de contato quando informado
 * 3. Mesa ou sala escolhida
 * 4. Data
 * 5. Horário
 * 6. Quantidade de pessoas
 * 7. Valor total
 * 8. Forma de pagamento
 * 9. Valor que pretende pagar agora
 */
export function gerarMensagemReservaWhatsApp({
  nome,
  telefone,
  mesaOuSala,
  data,
  horario,
  pessoas,
  valorTotal,
  formaPagamento,
  metodo,
  valorPagarAgora,
  codigoReserva
} = {}) {
  const cleanNome = (nome || '').trim() || 'Não informado';
  const cleanTel = (telefone || '').trim() || 'Não informado';
  const cleanEspaco = (mesaOuSala || '').trim() || 'A definir';
  const cleanData = (data || '').trim() || 'A definir';
  const cleanHorario = (horario || '').trim() || '19:00';
  const cleanPessoas = pessoas ? `${pessoas} pessoa(s)` : 'A definir';
  const totalFmt = formatarMoeda(valorTotal);
  const pagarAgoraFmt = formatarMoeda(valorPagarAgora !== undefined && valorPagarAgora !== null ? valorPagarAgora : valorTotal);

  const rawForma = formaPagamento || metodo || 'Pix';
  const metodoNormalizado = String(rawForma)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const nomeFormaPagamento = metodoNormalizado.includes('cred')
    ? 'Cartão de Crédito'
    : metodoNormalizado.includes('deb')
      ? 'Cartão de Débito'
      : 'Pix';

  const linhas = [
    `Olá, equipe Backstage Karaokê! Gostaria de dar andamento à minha reserva:`,
    ``,
    ...(codigoReserva ? [`*Código da Reserva:* ${codigoReserva}`] : []),
    `*Nome do Cliente:* ${cleanNome}`,
    `*Telefone de Contato:* ${cleanTel}`,
    `*Espaço Escolhido:* ${cleanEspaco}`,
    `*Data:* ${cleanData}`,
    `*Horário:* ${cleanHorario}`,
    `*Quantidade de Pessoas:* ${cleanPessoas}`,
    `*Valor Total:* ${totalFmt}`,
    `*Forma de Pagamento:* ${nomeFormaPagamento}`,
    `*Valor que pretendo pagar agora:* ${pagarAgoraFmt}`,
    ``
  ];

  if (nomeFormaPagamento === 'Pix') {
    linhas.push(`Segue o comprovante da transferência Pix em anexo para conferência da equipe.`);
  } else if (nomeFormaPagamento === 'Cartão de Crédito') {
    linhas.push(`Gostaria de combinar as instruções e opções de pagamento por cartão de crédito com a equipe.`);
  } else {
    linhas.push(`Gostaria de combinar o pagamento por débito com a equipe.`);
  }

  linhas.push(``);
  linhas.push(`Aguardo a conferência e confirmação da reserva!`);

  return linhas.join('\n');
}

/**
 * Valida o número oficial do WhatsApp configurado no painel administrativo
 * e gera o link seguro para abertura da conversa com a mensagem pré-preenchida.
 * Se o WhatsApp oficial não estiver configurado, lança um erro explicativo.
 */
export function gerarLinkWhatsAppManual({
  whatsappOficial,
  dadosReserva
}) {
  const cleanPhone = String(whatsappOficial || '').replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('WhatsApp oficial do estabelecimento não configurado no painel administrativo.');
  }

  const phoneCompleto = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const mensagem = gerarMensagemReservaWhatsApp(dadosReserva);

  return `https://wa.me/${phoneCompleto}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Obtém os dados Pix configurados pelo estabelecimento.
 * Não inventa chaves fictícias nem gera QR Codes falsos se não estiver configurado.
 */
export function obterDadosPixConfigurados(configuracoes = {}) {
  const chave = String(configuracoes.pixChave || configuracoes.pix_chave || '').trim();
  const qrcodeUrl = String(configuracoes.pixQrcodeUrl || configuracoes.pix_qrcode_url || '').trim();
  const tipo = String(configuracoes.pixTipoChave || configuracoes.pix_tipo_chave || '').trim() || 'Chave Pix';
  const titular = String(configuracoes.pixTitular || configuracoes.pix_titular || '').trim();
  const copiaCola = String(configuracoes.pixCopiaCola || configuracoes.pix_copia_cola || chave).trim();

  const configurado = Boolean(chave || qrcodeUrl);

  return {
    configurado,
    chave: configurado ? chave : '',
    tipo: configurado ? tipo : '',
    titular: configurado ? titular : '',
    qrcodeUrl: configurado ? qrcodeUrl : '',
    copiaCola: configurado ? copiaCola : ''
  };
}

/**
 * Cria uma sessão segura de pagamento para a reserva formatada para o Asaas.
 *
 * @param {Object} params
 * @param {string} params.reservaId
 * @param {string} params.codigoReserva
 * @param {number} params.valor
 * @param {string} params.metodo - 'pix' | 'debito' | 'credito'
 * @param {Object} params.comprador - { nome, email, whatsapp }
 * @param {string} params.ambiente - 'Salão Principal' | etc
 * @param {string} [params.tipoReserva] - 'sala' | 'mesa'
 * @param {string} [params.salaNome]
 * @param {string} [params.mesaId]
 * @param {number} [params.pessoas]
 * @returns {Promise<Object>}
 */
export async function createPaymentSession({
  reservaId,
  codigoReserva,
  valor,
  metodo = PAYMENT_METHODS.PIX,
  comprador,
  ambiente = 'Salão Principal',
  tipoReserva,
  salaNome,
  mesaId,
  pessoas
}) {
  const cleanPhone = (comprador?.whatsapp || '').replace(/\D/g, '');
  const cleanMetodo = (metodo === 'cartao_credito' ? 'credito' : metodo).toLowerCase();

  const asaasBillingType = cleanMetodo === 'pix'
    ? 'PIX'
    : cleanMetodo === 'debito'
      ? 'DEBIT_CARD'
      : 'CREDIT_CARD';

  // 1. Tenta acionar o backend seguro do Asaas (/api/asaas-criar-cobranca)
  try {
    const res = await fetch('/api/asaas-criar-cobranca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: comprador?.nome,
        email: comprador?.email,
        telefone: cleanPhone,
        metodo: cleanMetodo,
        tipoReserva,
        salaNome,
        mesaId,
        pessoas,
        ambiente,
        valor: Number(valor),
        codigoReserva,
        descricao: `Reserva Backstage Karaokê (${ambiente}) - ${codigoReserva}`
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.sucesso) {
        const checkoutUrl = data.checkoutUrl || data.invoiceUrl || null;
        if ((cleanMetodo === 'credito' || cleanMetodo === 'debito')) {
          if (!checkoutUrl || !checkoutUrl.startsWith('http') || checkoutUrl.endsWith('/i/') || checkoutUrl.endsWith('/c/') || checkoutUrl.includes('/login') || checkoutUrl.includes('/cadastro')) {
            throw new Error(data.error || 'O Asaas não retornou uma URL válida de fatura/checkout para pagamento com cartão.');
          }
        }

        return {
          gateway: 'asaas',
          transacaoId: data.pagamentoId,
          reservaId,
          codigoReserva,
          valor: Number(data.valor || valor),
          metodo: cleanMetodo,
          asaasBillingType,
          status: data.status || PAYMENT_STATUS.PENDING,
          criadoEm: new Date().toISOString(),
          expiraEm: data.expiracaoPix || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          comprador: {
            nome: comprador.nome,
            email: comprador.email,
            whatsapp: cleanPhone
          },
          ambiente,
          pixCopiaECola: data.pixCopiaECola || null,
          pixQrCodeBase64: data.pixQrCodeBase64 || null,
          checkoutUrl,
          ambienteAsaas: data.ambiente,
          sandboxNotice: data.sandboxNotice || null
        };
      } else {
        throw new Error(data.error || 'Falha ao processar cobrança oficial no Asaas.');
      }
    } else {
      const errData = await res.json().catch(() => null);
      const errMsg = errData?.mensagem || errData?.error || `Erro de comunicação com o Asaas (HTTP ${res.status}).`;
      throw new Error(errMsg);
    }
  } catch (apiErr) {
    console.error('[Asaas Checkout] Erro ao gerar cobrança oficial:', apiErr.message);
    throw apiErr;
  }
}


/**
 * Consulta o status atual de uma cobrança no Asaas via backend seguro
 */
export async function checkPaymentStatus(transacaoId) {
  try {
    if (transacaoId && !transacaoId.startsWith('asaas_pay_')) {
      const res = await fetch(`/api/asaas-status?id=${encodeURIComponent(transacaoId)}`);
      if (res.ok) {
        const data = await res.json();
        const isPago = Boolean(data.pago || data.status === 'RECEIVED' || data.status === 'CONFIRMED');
        return {
          transacaoId: data.id || transacaoId,
          gateway: 'asaas',
          status: data.status,
          pago: isPago,
          valor: data.valor,
          dataPagamento: data.dataPagamento,
          atualizadoEm: new Date().toISOString()
        };
      }
    }
  } catch (e) {
    console.warn('Falha ao consultar status Asaas no servidor:', e.message);
  }

  return {
    transacaoId,
    gateway: 'asaas',
    status: PAYMENT_STATUS.PENDING,
    pago: false,
    atualizadoEm: new Date().toISOString()
  };
}

/**
 * Valida a confirmação de recebimento do pagamento exclusivamente junto ao servidor Asaas
 * NUNCA confirma automaticamente sem atestado do servidor.
 */
export async function processPaymentConfirmation({
  reservaId,
  transacaoId,
  metodo = PAYMENT_METHODS.PIX
}) {
  const cleanMetodo = (metodo === 'cartao_credito' ? 'credito' : metodo).toLowerCase();

  // Consulta real obrigatória no servidor Asaas
  const statusCheck = await checkPaymentStatus(transacaoId);

  if (statusCheck && statusCheck.pago) {
    return {
      success: true,
      pago: true,
      gateway: 'asaas',
      transacaoId,
      reservaId,
      metodo: cleanMetodo,
      status: PAYMENT_STATUS.APPROVED,
      pagoEm: statusCheck.dataPagamento || new Date().toISOString(),
      mensagem: 'Pagamento aprovado e confirmado oficialmente pelo Asaas!'
    };
  }

  return {
    success: false,
    pago: false,
    gateway: 'asaas',
    transacaoId,
    reservaId,
    metodo: cleanMetodo,
    status: statusCheck?.status || PAYMENT_STATUS.PENDING,
    mensagem: 'Pagamento pendente. Aguardando compensação pela instituição financeira.'
  };
}

