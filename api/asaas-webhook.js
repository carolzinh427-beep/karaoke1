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

// Cache em memória para deduplicação ultra-rápida de eventos do webhook Asaas (Idempotência)
const PROCESSED_WEBHOOK_EVENTS = new Map();
const DEDUPLICATION_TTL_MS = 60 * 60 * 1000; // 1 hora

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

  if (!event || !payment || !payment.id) {
    return res.status(400).json({ error: 'Payload de webhook inválido ou incompleto.' });
  }

  // 2. Proteção de Idempotência em Memória (Impede processamento duplicado imediato)
  const eventDeduplicationKey = `${event}_${payment.id}_${payment.status || ''}`;
  const now = Date.now();
  if (PROCESSED_WEBHOOK_EVENTS.has(eventDeduplicationKey)) {
    const processedAt = PROCESSED_WEBHOOK_EVENTS.get(eventDeduplicationKey);
    if (now - processedAt < DEDUPLICATION_TTL_MS) {
      console.log(`[Asaas Webhook] Evento duplicado descartado por idempotência imediata: ${eventDeduplicationKey}`);
      return res.status(200).json({
        received: true,
        duplicado: true,
        event,
        paymentId: payment.id,
        mensagem: 'Evento já processado anteriormente (idempotente).'
      });
    }
  }

  // Registra no cache de eventos processados
  PROCESSED_WEBHOOK_EVENTS.set(eventDeduplicationKey, now);
  if (PROCESSED_WEBHOOK_EVENTS.size > 1000) {
    for (const [k, v] of PROCESSED_WEBHOOK_EVENTS.entries()) {
      if (now - v > DEDUPLICATION_TTL_MS) PROCESSED_WEBHOOK_EVENTS.delete(k);
    }
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

    // 2. Atualização segura no banco de dados Supabase via SERVICE_ROLE_KEY
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[Asaas Webhook] Aviso: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas no servidor.');
    } else if (statusNovoReserva && (codigoReserva || pagamentoId)) {
      try {
        const filterCol = codigoReserva ? 'codigo_reserva' : 'transacao_id';
        const filterVal = codigoReserva || pagamentoId;

        // 2.1. Valida existência da reserva no Supabase
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/reservas?${filterCol}=eq.${encodeURIComponent(filterVal)}&select=id,codigo_reserva,status,status_pagamento,transacao_id,valor_total`, {
          method: 'GET',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          }
        });

        if (checkRes.ok) {
          const reservas = await checkRes.json();
          if (!reservas || reservas.length === 0) {
            console.warn(`[Asaas Webhook] Aviso: Cobrança ${pagamentoId} recebida, mas nenhuma reserva correspondente a ${filterVal} foi localizada.`);
          } else {
            const reserva = reservas[0];

            // 2.2. Proteção contra eventos duplicados (Idempotência)
            if (reserva.status === statusNovoReserva && reserva.status_pagamento === statusPagamento) {
              console.log(`[Asaas Webhook] Evento duplicado ignorado (idempotente): reserva ${reserva.codigo_reserva} já está com status ${statusNovoReserva}.`);
              return res.status(200).json({
                received: true,
                duplicado: true,
                codigoReserva: reserva.codigo_reserva,
                status: statusNovoReserva
              });
            }

            // 2.3. Atualiza status da reserva com dados oficiais do Asaas
            const patchData = {
              status: statusNovoReserva,
              status_pagamento: statusPagamento,
              transacao_id: pagamentoId,
              valor_pago: Number(payment.value || reserva.valor_total || 0),
              atualizado_em: new Date().toISOString()
            };

            const updateRes = await fetch(`${supabaseUrl}/rest/v1/reservas?id=eq.${encodeURIComponent(reserva.id)}`, {
              method: 'PATCH',
              headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(patchData)
            });

            if (updateRes.ok) {
              console.log(`[Asaas Webhook] Reserva ${reserva.codigo_reserva} atualizada para ${statusNovoReserva} (${statusPagamento})`);

              // 2.4. Registra histórico na tabela auditável de pagamentos
              try {
                await fetch(`${supabaseUrl}/rest/v1/pagamentos`, {
                  method: 'POST',
                  headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                  },
                  body: JSON.stringify({
                    reserva_id: reserva.id,
                    codigo_reserva: reserva.codigo_reserva,
                    gateway: 'asaas',
                    transacao_id: pagamentoId,
                    valor: Number(payment.value || reserva.valor_total || 0),
                    metodo: (billingType || 'pix').toLowerCase(),
                    status: statusPagamento,
                    pago_em: (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') ? new Date().toISOString() : null,
                    metadata_seguro: {
                      event,
                      statusAsaas: statusAsaas,
                      confirmedDate: payment.confirmedDate || null
                    }
                  })
                });
              } catch (histErr) {
                console.warn('[Asaas Webhook] Aviso ao registrar histórico de pagamento:', histErr.message);
              }
            } else {
              console.warn('[Asaas Webhook] Falha ao atualizar reserva no Supabase:', updateRes.status);
            }
          }
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
    return res.status(500).json({ error: 'Erro interno ao processar webhook do Asaas: ' + err.message });
  }
}
