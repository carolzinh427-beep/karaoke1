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
      billingType = 'DEBIT_CARD';
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
