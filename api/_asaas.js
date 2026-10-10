/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — CLIENTE DE INTEGRAÇÃO OFICIAL ASAAS (BACKEND SEGURO)
 * ==============================================================================
 * REGRAS CRÍTICAS DE SEGURANÇA:
 * 1. A chave ASAAS_API_KEY fica restrita ao servidor/Node.js (Serverless).
 * 2. NUNCA utilize o prefixo 'VITE_' nesta chave.
 * 3. NUNCA retorne a chave nem envie credenciais para o cliente/navegador.
 * 4. Não armazene chaves nem dados de cartão no Supabase ou banco de dados.
 * ==============================================================================
 */

const SANDBOX_BASE_URL = 'https://api-sandbox.asaas.com/v3';
const PRODUCTION_BASE_URL = 'https://api.asaas.com/v3';

export function getAsaasConfig() {
  const apiKey = (process.env.ASAAS_API_KEY || '').trim();
  const envSetting = (process.env.ASAAS_ENVIRONMENT || 'sandbox').trim().toLowerCase();

  // Determina ambiente: produção apenas se expressamente configurado ou chave de produção
  const isProduction = envSetting === 'production' || (apiKey.startsWith('$aact_') && !apiKey.includes('hml') && envSetting !== 'sandbox');
  const baseUrl = isProduction ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;

  return {
    apiKey,
    baseUrl,
    environment: isProduction ? 'production' : 'sandbox',
    isConfigured: Boolean(apiKey && apiKey.length > 5),
    webhookSecret: (process.env.ASAAS_WEBHOOK_SECRET || '').trim()
  };
}

/**
 * Executa requisição autenticada à API v3 do Asaas
 */
export async function asaasRequest(endpoint, options = {}) {
  const config = getAsaasConfig();

  if (!config.isConfigured) {
    throw new Error(
      'ASAAS_API_KEY não configurada no servidor. Defina a variável de ambiente ASAAS_API_KEY no arquivo .env.local ou nas Environment Variables da Vercel.'
    );
  }

  const url = `${config.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'BackstageKaraoke-AsaasIntegration/1.0',
    'access_token': config.apiKey,
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    const text = await response.text();
    data = { raw: text };
  }

  if (!response.ok) {
    const errorMsg = data?.errors?.[0]?.description || data?.message || `Erro HTTP ${response.status} na API do Asaas`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data?.errors || data;
    throw err;
  }

  return data;
}

/**
 * Busca cliente existente por e-mail ou cria um novo cadastro no Asaas
 */
export async function obterOuCriarClienteAsaas({ nome, email, telefone, cpfCnpj }) {
  if (!email && !telefone) {
    throw new Error('E-mail ou telefone obrigatório para cadastrar cliente no Asaas.');
  }

  // 1. Tenta buscar cliente existente por e-mail
  if (email) {
    try {
      const searchRes = await asaasRequest(`/customers?email=${encodeURIComponent(email)}`, {
        method: 'GET'
      });
      if (searchRes?.data && searchRes.data.length > 0) {
        return searchRes.data[0];
      }
    } catch (e) {
      console.warn('Aviso: busca por cliente Asaas via e-mail falhou:', e.message);
    }
  }

  // 2. Limpa formatação do telefone
  const foneLimpo = (telefone || '').replace(/\D/g, '');

  // 3. Cria novo cliente
  const payload = {
    name: nome || 'Cliente Backstage',
    email: email || undefined,
    mobilePhone: foneLimpo.length >= 10 ? foneLimpo : undefined,
    cpfCnpj: cpfCnpj ? cpfCnpj.replace(/\D/g, '') : undefined,
    notificationDisabled: false
  };

  return await asaasRequest('/customers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Cria cobrança no Asaas (Pix, Cartão de Crédito ou Débito)
 */
export async function criarCobrancaAsaas({
  customerId,
  billingType = 'PIX',
  valor,
  dueDate,
  description,
  externalReference
}) {
  if (!customerId) throw new Error('customerId é obrigatório para gerar cobrança.');
  if (!valor || valor <= 0) throw new Error('Valor inválido para cobrança.');

  // Data de vencimento (padrão: hoje ou data fornecida)
  const due = dueDate || new Date().toISOString().split('T')[0];

  const payload = {
    customer: customerId,
    billingType: billingType.toUpperCase(),
    value: Number(valor).toFixed(2),
    dueDate: due,
    description: description || 'Reserva de Mesa — Backstage Karaokê',
    externalReference: externalReference || undefined,
    postalService: false
  };

  return await asaasRequest('/payments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Cria Link de Pagamento avulso no Asaas (/v3/paymentLinks)
 * Fluxo alternativo oficial do Asaas para checkout hospedado.
 */
export async function criarLinkPagamentoAsaas({
  nome,
  description,
  valor,
  billingType = 'UNDEFINED',
  dueDateLimitDays = 1,
  externalReference
}) {
  if (!valor || valor <= 0) throw new Error('Valor inválido para link de pagamento.');

  const payload = {
    name: nome || 'Reserva Backstage Karaokê',
    description: description || 'Reserva Backstage Karaokê',
    value: Number(valor).toFixed(2),
    billingType: billingType.toUpperCase(),
    chargeType: 'DETACHED',
    dueDateLimitDays: dueDateLimitDays || 1,
    externalReference: externalReference || undefined
  };

  return await asaasRequest('/paymentLinks', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}


/**
 * Recupera o código Pix Copia e Cola e a imagem QR Code de uma cobrança Pix
 */
export async function obterPixQrCodeAsaas(paymentId) {
  if (!paymentId) throw new Error('paymentId obrigatório para obter QrCode Pix.');
  return await asaasRequest(`/payments/${paymentId}/pixQrCode`, {
    method: 'GET'
  });
}

/**
 * Consulta o status atualizado de uma cobrança
 */
export async function consultarCobrancaAsaas(paymentId) {
  if (!paymentId) throw new Error('paymentId obrigatório para consulta.');
  return await asaasRequest(`/payments/${paymentId}`, {
    method: 'GET'
  });
}

/**
 * Consulta dados cadastrais da conta Asaas vinculada à API Key (para verificação do estabelecimento)
 */
export async function consultarDadosContaAsaas() {
  const config = getAsaasConfig();
  if (!config.isConfigured) {
    return {
      configurado: false,
      ambiente: config.environment,
      mensagem: 'ASAAS_API_KEY não configurada no servidor.'
    };
  }

  try {
    const dados = await asaasRequest('/myAccount', { method: 'GET' });
    return {
      configurado: true,
      ambiente: config.environment,
      nome: dados.name,
      email: dados.email || dados.loginEmail,
      cpfCnpj: dados.cpfCnpj,
      cidade: dados.city,
      estado: dados.state
    };
  } catch (err) {
    return {
      configurado: true,
      ambiente: config.environment,
      erro: err.message
    };
  }
}


/**
 * Valida integridade e autenticidade da requisição de Webhook recebida do Asaas
 * Em ambiente de Produção, a presença e exatidão de ASAAS_WEBHOOK_SECRET são mandatórias.
 */
export function validarWebhookAsaas(req) {
  const config = getAsaasConfig();
  const isProd = config.environment === 'production';

  // Em Produção, falha de forma segura se ASAAS_WEBHOOK_SECRET estiver vazio
  if (!config.webhookSecret) {
    if (isProd) {
      return {
        valido: false,
        erro: 'Segurança de Produção: ASAAS_WEBHOOK_SECRET não configurado no servidor. Webhook rejeitado.'
      };
    }
    // Em sandbox/dev, emite aviso explicativo no servidor
    console.warn('[Asaas Webhook] Aviso: ASAAS_WEBHOOK_SECRET não configurado em ambiente de desenvolvimento/sandbox.');
    return { valido: true };
  }

  const tokenRecebido = req.headers['asaas-access-token'] || 
                        req.headers['authorization'] || 
                        req.headers['x-asaas-token'] || '';

  if (!tokenRecebido || tokenRecebido.trim() !== config.webhookSecret.trim()) {
    return {
      valido: false,
      erro: 'Token de autenticação do Webhook Asaas inválido ou ausente.'
    };
  }

  return { valido: true };
}

/**
 * ==============================================================================
 * PREÇOS E REGRAS OFICIAIS DE COBRANÇA (BACKEND SEGURO)
 * ==============================================================================
 * Regras estritas:
 * 1. Salas Privadas (Red R$ 800, Green R$ 900, Blue R$ 1.000):
 *    - Pagamento 100% integral no ato da reserva.
 *    - Sem sinal de 50%, sem saldo na recepção.
 *    - Preço fixo total da sala, NUNCA multiplicado por quantidade de convidados.
 *    - Mesmo valor independente da forma de pagamento (Pix, Débito ou Crédito).
 * 2. Mesas do Salão Principal:
 *    - Cobrança por pessoa: Pix R$ 20, Débito R$ 20, Crédito R$ 25.
 * ==============================================================================
 */

export const PRECOS_SALAS_OFICIAIS = {
  'sala red': 800,
  'sala green': 900,
  'sala blue': 1000
};

export const TARIFAS_SALAO_OFICIAIS = {
  pix: 20,
  debito: 20,
  credito: 25
};

/**
 * Calcula o preço oficial no servidor de forma autoritativa.
 * O servidor NUNCA confia em valores enviados pelo cliente/navegador.
 */
export function calcularPrecoOficialServidor({
  tipoReserva = '',
  salaNome = '',
  mesaId = '',
  ambiente = '',
  pessoas = 1,
  metodo = 'pix'
} = {}) {
  const cleanMetodo = (metodo || 'pix').toLowerCase();
  const metodoNormalizado = (cleanMetodo === 'credito' || cleanMetodo === 'credit_card' || cleanMetodo === 'cartao_credito')
    ? 'credito'
    : (cleanMetodo === 'debito' || cleanMetodo === 'debit_card')
      ? 'debito'
      : 'pix';

  const salaLower = (salaNome || '').toLowerCase().trim();
  const ambienteLower = (ambiente || '').toLowerCase().trim();
  const isTipoSala = (tipoReserva || '').toLowerCase() === 'sala';

  const isSalaPrivada = isTipoSala ||
    salaLower.includes('red') || salaLower.includes('green') || salaLower.includes('blue') ||
    ambienteLower.includes('sala red') || ambienteLower.includes('sala green') || ambienteLower.includes('sala blue');

  if (isSalaPrivada) {
    let valor = 800;
    let nomeNormalizado = 'Sala Red';

    if (salaLower.includes('blue') || ambienteLower.includes('blue')) {
      valor = PRECOS_SALAS_OFICIAIS['sala blue']; // 1000
      nomeNormalizado = 'Sala Blue';
    } else if (salaLower.includes('green') || ambienteLower.includes('green')) {
      valor = PRECOS_SALAS_OFICIAIS['sala green']; // 900
      nomeNormalizado = 'Sala Green';
    } else {
      valor = PRECOS_SALAS_OFICIAIS['sala red']; // 800
      nomeNormalizado = 'Sala Red';
    }

    const qtdConvidados = Math.max(1, parseInt(pessoas, 10) || 1);

    return {
      tipo: 'sala',
      nome: nomeNormalizado,
      pessoas: qtdConvidados,
      valor,
      metodo: metodoNormalizado,
      isFixoIntegral: true,
      descricao: `Reserva ${nomeNormalizado} (${qtdConvidados} convidados) - Pagamento Integral: R$ ${valor.toFixed(2)}`
    };
  }

  // Mesas do Salão Principal (cobrança individual por pessoa)
  const qtdPessoas = Math.max(1, parseInt(pessoas, 10) || 1);
  const tarifaPorPessoa = TARIFAS_SALAO_OFICIAIS[metodoNormalizado];
  const valorTotal = qtdPessoas * tarifaPorPessoa;

  return {
    tipo: 'mesa',
    nome: mesaId || 'Mesa Salão Principal',
    pessoas: qtdPessoas,
    tarifaPorPessoa,
    valor: valorTotal,
    metodo: metodoNormalizado,
    isFixoIntegral: false,
    descricao: `Reserva Mesa Salão - ${qtdPessoas} pessoa(s) a R$ ${tarifaPorPessoa.toFixed(2)}/pessoa (${metodoNormalizado.toUpperCase()})`
  };
}

