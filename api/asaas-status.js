/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — CONSULTA DE STATUS E CONEXÃO ASAAS (SERVERLESS)
 * ==============================================================================
 * Rota: GET /api/asaas-status?id=pay_xxxx
 * Se nenhum id for passado, retorna o status da conexão do backend com o Asaas
 * sem expor a chave de API.
 * ==============================================================================
 */

import { getAsaasConfig, consultarCobrancaAsaas, asaasRequest } from './_asaas.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Utilize GET.' });
  }

  const config = getAsaasConfig();

  // Teste de conexão ou status geral
  const paymentId = req.query?.id || (new URL(req.url, 'http://localhost')).searchParams.get('id');

  if (!paymentId) {
    // Retorna diagnóstico de conectividade segura
    if (!config.isConfigured) {
      return res.status(200).json({
        conectado: false,
        configurado: false,
        ambiente: config.environment,
        mensagem: 'ASAAS_API_KEY ainda não configurada no servidor (.env.local ou Vercel).'
      });
    }

    // Testa a chave chamando endpoint seguro no Asaas (/finance/balance)
    try {
      const balanceData = await asaasRequest('/finance/balance', { method: 'GET' });
      return res.status(200).json({
        conectado: true,
        configurado: true,
        ambiente: config.environment,
        saldoDisponivel: balanceData?.totalBalance ?? null,
        mensagem: 'Conexão com a API do Asaas autenticada com sucesso!'
      });
    } catch (testErr) {
      return res.status(200).json({
        conectado: false,
        configurado: true,
        ambiente: config.environment,
        erro: testErr.message || 'Chave configurada, mas a chamada à API do Asaas falhou.',
        detalhes: testErr.details || null
      });
    }
  }

  // Consulta cobrança específica
  if (!config.isConfigured) {
    return res.status(503).json({ error: 'ASAAS_API_KEY não configurada.' });
  }

  try {
    const cobranca = await consultarCobrancaAsaas(paymentId);
    return res.status(200).json({
      id: cobranca.id,
      status: cobranca.status,
      valor: cobranca.value,
      metodo: cobranca.billingType,
      dataVencimento: cobranca.dueDate,
      dataPagamento: cobranca.paymentDate,
      invoiceUrl: cobranca.invoiceUrl
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message || 'Falha ao consultar cobrança no Asaas.',
      details: err.details || null
    });
  }
}
