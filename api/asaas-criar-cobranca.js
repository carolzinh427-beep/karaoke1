/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — ENDPOINT DE CRIAÇÃO DE COBRANÇAS ASAAS (SERVERLESS)
 * ==============================================================================
 * Rota: POST /api/asaas-criar-cobranca
 * Segurança: Nunca expõe a ASAAS_API_KEY ao cliente.
 * ==============================================================================
 */

import {
  getAsaasConfig,
  obterOuCriarClienteAsaas,
  criarCobrancaAsaas,
  criarLinkPagamentoAsaas,
  obterPixQrCodeAsaas,
  calcularPrecoOficialServidor
} from './_asaas.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  const {
    nome,
    email,
    telefone,
    cpfCnpj,
    metodo = 'pix',
    tipoReserva,
    salaNome,
    mesaId,
    ambiente,
    pessoas,
    valor,
    codigoReserva,
    descricao
  } = req.body || {};

  // 1. Calcula o valor oficial de forma autoritativa no servidor (NUNCA confia no navegador)
  const calculoOficial = calcularPrecoOficialServidor({
    tipoReserva,
    salaNome,
    mesaId,
    ambiente,
    pessoas,
    metodo
  });

  const valorOficial = calculoOficial.valor;

  // 2. Proteção de Segurança: detecta e rejeita imediatamente tentativa de alterar o preço pelo navegador
  if (valor !== undefined && valor !== null && valor !== '') {
    const valorEnviadoNum = Number(valor);
    if (isNaN(valorEnviadoNum) || Math.abs(valorEnviadoNum - valorOficial) > 0.01) {
      console.warn(`[Segurança Asaas] Tentativa de alteração de preço pelo navegador bloqueada! Esperado: R$ ${valorOficial.toFixed(2)}, Recebido: R$ ${Number(valor).toFixed(2)}`);
      return res.status(400).json({
        sucesso: false,
        error: `Tentativa de alteração de preço pelo navegador detectada. O valor oficial para esta reserva é R$ ${valorOficial.toFixed(2)}, mas foi recebido R$ ${Number(valor).toFixed(2)}.`,
        valorEsperado: valorOficial,
        valorRecebido: valorEnviadoNum
      });
    }
  }

  const config = getAsaasConfig();

  // 3. Se a chave ainda não estiver configurada no .env.local
  if (!config.isConfigured) {
    return res.status(503).json({
      configurado: false,
      error: 'Gateway Asaas aguardando configuração da chave API.',
      mensagem: 'Defina a variável ASAAS_API_KEY no arquivo .env.local ou nas variáveis da Vercel para habilitar cobranças reais via Asaas.',
      ambiente: config.environment
    });
  }

  try {
    // 3. Cadastra ou recupera cliente no Asaas
    const cliente = await obterOuCriarClienteAsaas({
      nome: nome || 'Cliente Backstage',
      email: email || undefined,
      telefone: telefone || undefined,
      cpfCnpj: cpfCnpj || undefined
    });

    // 4. Mapeia método para o Asaas
    let billingType = 'PIX';
    const m = (metodo || '').toLowerCase();
    if (m === 'credito' || m === 'credit_card' || m === 'cartao_credito') {
      billingType = 'CREDIT_CARD';
    } else if (m === 'debito' || m === 'debit_card') {
      // No Asaas, cobrança avulsa com fatura para débito deve ser criada com 'UNDEFINED',
      // pois 'DEBIT_CARD' avulso não é aceito diretamente sem dados do cartão.
      // O tipo 'UNDEFINED' habilita na fatura pública do Asaas as opções de débito, crédito e Pix.
      billingType = 'UNDEFINED';
    }

    // 5. Cria a cobrança oficial no Asaas utilizando estritamente o valor calculado no backend
    const desc = descricao || calculoOficial.descricao || `Reserva Backstage Karaokê - Código: ${codigoReserva || 'S/N'}`;
    const cobranca = await criarCobrancaAsaas({
      customerId: cliente.id,
      billingType,
      valor: valorOficial,
      description: desc,
      externalReference: codigoReserva
    });

    // 6. Se for PIX, recupera dados do QR Code e Copia e Cola
    let pixData = null;
    if (billingType === 'PIX') {
      try {
        pixData = await obterPixQrCodeAsaas(cobranca.id);
      } catch (pixErr) {
        console.warn('Aviso: falha ao gerar QrCode Pix:', pixErr.message);
      }
    }

    // 7. Resolução e validação estrita da URL oficial da fatura/checkout específico da reserva
    // Validador: a URL DEVE ser absoluta e conter o identificador específico da fatura.
    // NUNCA deve ser uma URL genérica (ex: https://www.asaas.com, /i/, /c/ ou /login),
    // o que causaria redirecionamento indevido para a tela de login/cadastro do Asaas.
    const isValidSpecificPaymentUrl = (url) => {
      if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
      try {
        const parsed = new URL(url);
        const path = (parsed.pathname || '').trim();
        // Não pode ser apenas raiz nem /i/ ou /c/ sem token específico
        if (!path || path === '/' || path === '/i' || path === '/i/' || path === '/c' || path === '/c/') {
          return false;
        }
        // Não pode apontar para telas internas de login, autenticação ou cadastro
        if (path.includes('/login') || path.includes('/cadastro') || path.includes('/auth')) {
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    };

    let checkoutUrl = null;
    if (isValidSpecificPaymentUrl(cobranca?.invoiceUrl)) {
      checkoutUrl = cobranca.invoiceUrl;
    } else if (isValidSpecificPaymentUrl(cobranca?.paymentLink)) {
      checkoutUrl = cobranca.paymentLink;
    }

    // Se for cartão (crédito ou débito) e a cobrança não retornou URL específica válida,
    // utiliza o fluxo oficial alternativo de Payment Link do Asaas (/v3/paymentLinks)
    if (!checkoutUrl && (m === 'credito' || m === 'debito' || m === 'cartao_credito' || m === 'debit_card')) {
      try {
        const linkRes = await criarLinkPagamentoAsaas({
          nome: `Reserva - ${calculoOficial.nome}`,
          description: desc,
          valor: valorOficial,
          billingType: billingType === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'UNDEFINED',
          externalReference: codigoReserva
        });
        if (isValidSpecificPaymentUrl(linkRes?.url)) {
          checkoutUrl = linkRes.url;
        }
      } catch (linkErr) {
        console.warn('[Asaas Checkout] Falha no link de pagamento alternativo:', linkErr.message);
      }
    }

    // Se após todas as tentativas oficiais a API não forneceu um link válido para cartão,
    // retorna erro claro e explícito (Requisito 4), sem enviar URL genérica que direcione para login
    if (!checkoutUrl && (m === 'credito' || m === 'debito' || m === 'cartao_credito' || m === 'debit_card')) {
      return res.status(502).json({
        sucesso: false,
        error: 'O Asaas não gerou um link de checkout específico válido para esta cobrança.',
        detalhes: 'A resposta da API do Asaas não incluiu uma fatura acessível para pagamento. Nenhuma cobrança indevida foi realizada e a reserva permanece não confirmada.',
        ambiente: config.environment
      });
    }

    // 8. Retorna dados seguros ao frontend (SEM chaves de API nem credenciais expostas)
    return res.status(200).json({
      sucesso: true,
      pagamentoId: cobranca.id,
      clienteId: cliente.id,
      status: cobranca.status,
      valor: cobranca.value,
      metodo: cobranca.billingType,
      invoiceUrl: checkoutUrl || cobranca.invoiceUrl || null,
      checkoutUrl: checkoutUrl || cobranca.invoiceUrl || null,
      bankSlipUrl: cobranca.bankSlipUrl || null,
      pixCopiaECola: pixData?.payload || null,
      pixQrCodeBase64: pixData?.encodedImage || null,
      expiracaoPix: pixData?.expirationDate || null,
      ambiente: config.environment,
      sandboxNotice: config.environment === 'sandbox'
        ? 'Atenção: Cobrança criada no ambiente de testes Sandbox do Asaas. Para abrir a fatura no sandbox.asaas.com, você precisa estar conectado à sua conta de desenvolvedor Sandbox.'
        : null
    });
  } catch (err) {
    console.error('Erro ao gerar cobrança Asaas:', err);
    return res.status(err.status || 500).json({
      sucesso: false,
      error: err.message || 'Falha ao processar pagamento com o Asaas.',
      details: err.details || null
    });
  }
}
