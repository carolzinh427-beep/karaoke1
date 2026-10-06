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
  obterPixQrCodeAsaas
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

  const config = getAsaasConfig();

  // Se a chave ainda não estiver configurada no .env.local
  if (!config.isConfigured) {
    return res.status(503).json({
      configurado: false,
      error: 'Gateway Asaas aguardando configuração da chave API.',
      mensagem: 'Defina a variável ASAAS_API_KEY no arquivo .env.local ou nas variáveis da Vercel para habilitar cobranças reais via Asaas.',
      ambiente: config.environment
    });
  }

  const {
    nome,
    email,
    telefone,
    cpfCnpj,
    metodo = 'pix',
    valor,
    codigoReserva,
    descricao
  } = req.body || {};

  if (!valor || Number(valor) <= 0) {
    return res.status(400).json({ error: 'Valor da cobrança é obrigatório e deve ser maior que zero.' });
  }

  try {
    // 1. Cadastra ou recupera cliente no Asaas
    const cliente = await obterOuCriarClienteAsaas({
      nome: nome || 'Cliente Backstage',
      email: email || undefined,
      telefone: telefone || undefined,
      cpfCnpj: cpfCnpj || undefined
    });

    // 2. Mapeia método para o Asaas
    let billingType = 'PIX';
    const m = (metodo || '').toLowerCase();
    if (m === 'credito' || m === 'credit_card' || m === 'cartao_credito') {
      billingType = 'CREDIT_CARD';
    } else if (m === 'debito' || m === 'debit_card') {
      billingType = 'DEBIT_CARD';
    }

    // 3. Cria a cobrança
    const desc = descricao || `Reserva Backstage Karaokê - Código: ${codigoReserva || 'S/N'}`;
    const cobranca = await criarCobrancaAsaas({
      customerId: cliente.id,
      billingType,
      valor: Number(valor),
      description: desc,
      externalReference: codigoReserva
    });

    // 4. Se for PIX, recupera dados do QR Code e Copia e Cola
    let pixData = null;
    if (billingType === 'PIX') {
      try {
        pixData = await obterPixQrCodeAsaas(cobranca.id);
      } catch (pixErr) {
        console.warn('Aviso: falha ao gerar QrCode Pix:', pixErr.message);
      }
    }

    // 5. Retorna dados seguros ao frontend (SEM dados sensíveis)
    return res.status(200).json({
      sucesso: true,
      pagamentoId: cobranca.id,
      clienteId: cliente.id,
      status: cobranca.status,
      valor: cobranca.value,
      metodo: cobranca.billingType,
      invoiceUrl: cobranca.invoiceUrl,
      bankSlipUrl: cobranca.bankSlipUrl,
      pixCopiaECola: pixData?.payload || null,
      pixQrCodeBase64: pixData?.encodedImage || null,
      expiracaoPix: pixData?.expirationDate || null,
      ambiente: config.environment
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
