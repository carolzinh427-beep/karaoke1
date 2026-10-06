/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — RECEBEDOR DE WEBHOOKS OFICIAL DO ASAAS
 * ==============================================================================
 * Rota: POST /api/asaas-webhook
 * Função: Recebe notificações de confirmação/recebimento de Pix e Cartão
 * e atualiza automaticamente o status da reserva no sistema.
 * ==============================================================================
 */

import { validarWebhookAsaas } from './_asaas.js';

export default async function handler(req, res) {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, asaas-access-token, authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  // 1. Validação de autenticidade do webhook (se ASAAS_WEBHOOK_SECRET configurado)
  const validacao = validarWebhookAsaas(req);
  if (!validacao.valido) {
    console.warn('[Asaas Webhook] Tentativa rejeitada:', validacao.erro);
    return res.status(401).json({ error: validacao.erro });
  }

  const payload = req.body || {};
  const { event, payment } = payload;

  console.log(`[Asaas Webhook] Evento recebido: ${event || 'DESCONHECIDO'}`, {
    pagamentoId: payment?.id,
    valor: payment?.value,
    status: payment?.status,
    externalReference: payment?.externalReference
  });

  if (!event || !payment) {
    return res.status(400).json({ error: 'Payload de webhook inválido ou incompleto.' });
  }

  try {
    const codigoReserva = payment.externalReference || null;
    const pagamentoId = payment.id;
    const billingType = payment.billingType;
    const statusAsaas = payment.status;

    // Mapeia eventos para status do Backstage
    let statusNovoReserva = null;
    let statusPagamento = null;

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        statusNovoReserva = 'CONFIRMED';
        statusPagamento = 'aprovado';
        break;

      case 'PAYMENT_OVERDUE':
        statusNovoReserva = 'EXPIRED';
        statusPagamento = 'expirado';
        break;

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_DELETED':
        statusNovoReserva = 'CANCELLED';
        statusPagamento = 'estornado';
        break;

      case 'PAYMENT_CHARGEBACK_REQUESTED':
        statusPagamento = 'contestacao';
        break;

      default:
        console.log(`[Asaas Webhook] Evento ${event} registrado sem alteração imediata de status.`);
        break;
    }

    // 2. Atualização segura no banco de dados Supabase (caso configurado)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                        process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                        process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && statusNovoReserva && (codigoReserva || pagamentoId)) {
      try {
        const patchData = {
          status: statusNovoReserva,
          status_pagamento: statusPagamento,
          atualizado_em: new Date().toISOString()
        };

        const filterCol = codigoReserva ? 'codigo_reserva' : 'transacao_id';
        const filterVal = codigoReserva || pagamentoId;

        const updateRes = await fetch(`${supabaseUrl}/rest/v1/reservas?${filterCol}=eq.${encodeURIComponent(filterVal)}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(patchData)
        });

        if (updateRes.ok) {
          console.log(`[Asaas Webhook] Reserva ${filterVal} atualizada com sucesso para ${statusNovoReserva}`);
        } else {
          console.warn('[Asaas Webhook] Resposta não-200 do Supabase REST:', updateRes.status);
        }
      } catch (dbErr) {
        console.error('[Asaas Webhook] Erro ao sincronizar com Supabase:', dbErr.message);
      }
    }

    // 3. Responde 200 OK para confirmar o recebimento ao Asaas
    return res.status(200).json({
      received: true,
      event,
      paymentId: payment.id,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Asaas Webhook] Erro interno:', err);
    // Retorna 200 ou 500 dependendo da severidade
    return res.status(500).json({ error: 'Erro interno ao processar webhook do Asaas: ' + err.message });
  }
}
