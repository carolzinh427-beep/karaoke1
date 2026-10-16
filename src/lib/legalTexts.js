/**
 * ==============================================================================
 * BACKSTAGE KARAOKÊ — TEXTOS JURÍDICOS E CONFORMIDADE LEGAL
 * ==============================================================================
 * Em estrita conformidade com:
 * 1. Lei Federal nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD)
 * 2. Lei Federal nº 8.069/1990 (Estatuto da Criança e do Adolescente - ECA, esp. Art. 80)
 * 3. Lei Federal nº 8.078/1990 (Código de Defesa do Consumidor - CDC)
 * ==============================================================================
 */

export const VERSAO_DOCUMENTOS = '2026.1';

/**
 * REGRAS ESPECÍFICAS DE CADA AMBIENTE (IDADE, ACESSO E CONVIVÊNCIA)
 */
export const REGRAS_AMBIENTES = {
  'salao-principal': {
    id: 'salao-principal',
    titulo: 'Salão Principal (Palco Aberto & Bar)',
    faixaEtaria: 'Exclusivo para maiores de 18 anos (18+)',
    classificacaoBadge: '18+',
    permiteMenor: false,
    avisoDestaque: 'CLASSIFICAÇÃO ETÁRIA INTERNA: O Salão Principal possui classificação exclusiva para maiores de 18 anos. Não é permitida a entrada ou permanência de menores de idade neste ambiente.',
    regras: [
      'Entrada permitida exclusivamente para maiores de 18 anos com documento oficial de identificação original com foto (RG, CNH, Passaporte ou CNH Digital).',
      'Não é permitida a entrada de menores de idade, mesmo acompanhados por pais ou responsáveis legais, no Salão Principal, em conformidade com as diretrizes operacionais do estabelecimento.',
      'A cada 4 convidados da mesa, é concedido um número para chamada musical organizada pelo operador de som/DJ.',
      'É permitido levar bolo e doces decorativos para comemoração de aniversários.',
      'É terminantemente proibido o ingresso de bebidas alcoólicas, energéticos, refrigerantes e salgados de fontes externas.'
    ]
  },

  'salas-privadas': {
    id: 'salas-privadas',
    titulo: 'Salas Privadas VIP (Sala Red, Green e Blue)',
    faixaEtaria: 'Livre com presença obrigatória do responsável legal',
    classificacaoBadge: 'Livre c/ Responsável',
    permiteMenor: true,
    avisoDestaque: 'ACESSO FAMILIAR NAS SALAS PRIVADAS: A entrada de crianças e adolescentes é permitida nas salas privativas sob a responsabilidade, vigilância e presença contínua de seus pais ou responsáveis legais devidamente identificados.',
    regras: [
      'A locação de salas privadas é contratada obrigatoriamente por pessoa maior de 18 anos civilmente capaz.',
      'Crianças e adolescentes têm acesso permitido exclusivamente dentro das salas privadas contratadas, desde que acompanhados por pelo menos um dos pais ou responsável legal.',
      'O titular da reserva declara expressamente ser o pai, mãe ou tutor legal com autoridade sobre os menores presentes no seu grupo.',
      'Não coletamos nem armazenamos dados pessoais de crianças no sistema, nos termos do art. 14 da LGPD (minimização e melhor interesse da criança).',
      'A capacidade máxima de ocupação estipulada para cada sala (Red: 30 pessoas; Green: 40 pessoas; Blue: 50 pessoas) deve ser rigorosamente respeitada por normas do Corpo de Bombeiros e segurança.',
      'A locação de salas privadas pode ser realizada mediante pagamento integral ou pagamento de metade (50%) no ato da reserva e a outra metade na data do evento (Sala Red: R$ 800,00; Sala Green: R$ 900,00; Sala Blue: R$ 1.000,00).',
      'O valor da reserva de sala privada não é reembolsável, observadas a legislação aplicável e as circunstâncias do caso.',
      'Nas salas privadas, o valor contratado contempla o uso exclusivo da sala inteira, sem cobrança por pessoa e sem acréscimo de taxas adicionais.',
      'Danos e avarias causados aos equipamentos de som, microfones, TVs e tablets das salas serão de responsabilidade do titular contratante.'
    ]
  },

  'sinuca-bilhar': {
    id: 'sinuca-bilhar',
    titulo: 'Área de Jogos, Sinuca & Bilhar',
    faixaEtaria: 'Restrição legal conforme Artigo 80 do ECA',
    classificacaoBadge: 'Restrição Art. 80 ECA',
    permiteMenor: false,
    avisoDestaque: 'RESTRIÇÃO LEGAL (ART. 80 DO ECA): O artigo 80 do Estatuto da Criança e do Adolescente estabelece restrição expressa à entrada e permanência de crianças e adolescentes em estabelecimentos ou dependências que explorem comercialmente bilhar, sinuca ou jogos congêneres.',
    regras: [
      'Fundamentação legal: Nos termos do Art. 80 da Lei Federal nº 8.069/1990 (Estatuto da Criança e do Adolescente), é expressamente proibida a entrada e permanência de crianças e adolescentes nas áreas e dependências que explorem comercialmente sinuca, bilhar ou congêneres, salvo com autorização expressa da autoridade judiciária competente.',
      'Não se trata de proibição genérica ao jogo, mas sim do cumprimento integral da norma protetiva federal que disciplina a permanência física no recinto dos jogos.',
      'A utilização das mesas de sinuca é restrita a maiores de 18 anos devidamente identificados.',
      'Zelo absoluto com os tacos, panos das mesas e bolas numeradas oficiais.'
    ]
  }
};

/**
 * TERMOS E CONDIÇÕES OFICIAIS — BACKSTAGE KARAOKÊ
 */
export const TERMOS_COMPRA_RESERVA = `
# Termos e Condições — Backstage Karaokê

### 1. Reservas e pagamentos
A reserva será confirmada após a identificação do pagamento. O valor pago pela reserva não será reembolsado em caso de desistência ou cancelamento.

### 2. Menores de idade
Menores de 18 anos podem frequentar as salas privativas conforme as regras do estabelecimento, mas são proibidos de participar de jogos da sinuca na área do Backstage Karaoke.

### 3. Proibições
É proibido levar bebidas e salgados de fora para o estabelecimento.

### 4. Responsabilidade
O cliente é responsável pelas informações fornecidas na reserva e pelo uso adequado dos equipamentos e instalações.

Ao concluir a reserva, o cliente declara estar ciente e de acordo com estes termos, sem prejuízo dos direitos garantidos pela legislação brasileira.
`;

/**
 * POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)
 */
export const POLITICA_PRIVACIDADE = `
# POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS — LGPD

**Versão:** ${VERSAO_DOCUMENTOS}  
**Lei Aplicável:** Lei Geral de Proteção de Dados Pessoais (Lei Federal nº 13.709/2018 - LGPD)  
**Controlador:** Backstage Karaokê Brasília  

---

### 1. PRINCÍPIOS FUNDAMENTAIS
O Backstage Karaokê respeita a sua privacidade e atua em conformidade com os princípios da **finalidade, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação e responsabilização** (Artigo 6º da LGPD).

---

### 2. DADOS PESSOAIS COLETADOS E FINALIDADES
Coletamos exclusivamente os dados estritamente necessários para a execução do contrato de reserva e emissão do ingresso/voucher (Art. 7º, V da LGPD):
- **Nome Completo:** Identificação do titular da reserva e controle de portaria na recepção.
- **E-mail:** Envio do comprovante de compra, voucher com QR Code e eventuais avisos operacionais da reserva.
- **Número de WhatsApp / Telefone:** Contato de confirmação, suporte imediato e canal de atendimento.
- **Registros de Conexão e Aceite:** Timestamp (data e hora), versão dos termos aceitos e endereço IP para cumprimento de obrigação legal de guarda de registros (Marco Civil da Internet, Art. 15).

---

### 3. DADOS DE CRIANÇAS E ADOLESCENTES (ARTIGO 14 DA LGPD)
3.1. Em atenção ao melhor interesse da criança e do adolescente (Art. 14 da LGPD) e ao princípio da necessidade:
- **NÃO COLETAMOS NOMES, CPFs, FOTOS OU DADOS PESSOAIS DE CRIANÇAS** durante o processo de reserva.
- Nas salas privadas onde há presença familiar, coletamos apenas a quantidade numérica de convidados menores e a declaração de responsabilidade legal fornecida pelo comprador maior de idade.

---

### 4. SEGURANÇA E DADOS FINANCEIROS / CARTÃO DE CRÉDITO
4.1. **NÃO ARMAZENAMOS DADOS DE CARTÃO DE CRÉDITO OU DADOS BANCÁRIOS COMPLETOS.**  
4.2. O processamento de pagamentos digitais é realizado diretamente por gateways externos certificados sob o padrão global de segurança **PCI-DSS (Payment Card Industry Data Security Standard)**.
4.3. Nosso sistema recebe do provedor de pagamento unicamente a confirmação do status da transação (ex: "aprovado" ou "pendente") e o código identificador da operação para confirmação da reserva.

---

### 5. CONSENTIMENTO PARA MARKETING (SEPARADO E OPICIONAL)
5.1. O envio de promoções, programações especiais e novidades do Backstage Karaokê via e-mail ou WhatsApp depende de **consentimento livre, informado e inequívoco** (Art. 7º, I da LGPD).
5.2. O aceite das comunicações promocionais é disponibilizado em caixa de seleção destacada, desmarcada por padrão e totalmente independente da compra. O titular pode revogar seu consentimento a qualquer momento.

---

### 6. COMPARTILHAMENTO DE DADOS
Os dados pessoais coletados não são comercializados ou compartilhados com terceiros, exceto:
- Provedores essenciais de infraestrutura tecnológica (banco de dados em nuvem seguro com criptografia e provedor de entrega de e-mails transacionais);
- Autoridades públicas mediante ordem judicial ou exigência regulatória expressa.

---

### 7. DIREITOS DO TITULAR DOS DADOS
Nos termos do Artigo 18 da LGPD, o titular poderá a qualquer momento solicitar:
- Confirmação da existência de tratamento e acesso aos seus dados;
- Correção de dados incompletos ou desatualizados;
- Revogação de consentimentos concedidos anteriormente;
- Eliminação de dados tratados sob consentimento, ressalvadas as hipóteses legais de guarda (Art. 16 da LGPD).

Para exercer seus direitos de privacidade, entre em contato com a equipe Backstage Karaokê através do e-mail oficial ou canal de atendimento de privacidade.
`;
