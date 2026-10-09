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
          checkoutUrl: data.invoiceUrl || `https://sandbox.asaas.com/checkout/${data.pagamentoId}`,
          ambienteAsaas: data.ambiente
        };
      }
    } else {
      const errData = await res.json().catch(() => null);
      if (errData?.error) {
        throw new Error(errData.error);
      }
    }
  } catch (apiErr) {
    console.warn('Aviso ao gerar cobrança no servidor Asaas:', apiErr.message);
    if (apiErr.message.includes('Tentativa de alteração de preço') || apiErr.message.includes('bloqueada')) {
      throw apiErr;
    }
  }

  // 2. Fallback resiliente caso ASAAS_API_KEY ainda não tenha sido inserida
  const transacaoId = 'asaas_pay_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  const pixCopiaECola = `00020126580014br.gov.bcb.pix0136${codigoReserva || 'BK-2026'}5204000053039865405${Number(valor).toFixed(2)}5802BR5917Backstage Karaoke6008Brasilia62070503***6304`;

  return {
    gateway: 'asaas',
    transacaoId,
    reservaId,
    codigoReserva,
    valor: Number(valor),
    metodo: cleanMetodo,
    asaasBillingType,
    status: PAYMENT_STATUS.PENDING,
    criadoEm: new Date().toISOString(),
    expiraEm: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    comprador: {
      nome: comprador.nome,
      email: comprador.email,
      whatsapp: cleanPhone
    },
    ambiente,
    pixCopiaECola: cleanMetodo === 'pix' ? pixCopiaECola : null,
    pixQrCodeBase64: null,
    checkoutUrl: `https://sandbox.asaas.com/checkout/${transacaoId}`,
    ambienteAsaas: 'sandbox'
  };
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

