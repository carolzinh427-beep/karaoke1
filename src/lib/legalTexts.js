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
      'A reserva é confirmada mediante pagamento do sinal de 50%. Em razão do bloqueio da sala na agenda e da exclusividade do espaço, o valor do sinal não é reembolsável em caso de desistência ou não comparecimento.',
      'O saldo remanescente de 50% é quitado diretamente na recepção no momento da entrada do grupo.',
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
 * TERMOS E CONDIÇÕES DE COMPRA E RESERVA OFICIAL
 */
export const TERMOS_COMPRA_RESERVA = `
# TERMOS E CONDIÇÕES DE COMPRA E RESERVA — BACKSTAGE KARAOKÊ

**Versão dos Termos:** ${VERSAO_DOCUMENTOS}  
**Última Atualização:** Outubro de 2026  
**Estabelecimento:** Backstage Karaokê Brasília  
**Endereço:** CLN 307, Bloco A, Subsolo — Asa Norte, Brasília/DF  

---

### 1. DO OBJETO
1.1. O presente instrumento regula a reserva de espaços, salas privativas e ingressos para o **Backstage Karaokê Brasília**, através da sua plataforma digital.
1.2. A conclusão da compra e/ou reserva formaliza um contrato de prestação de serviços de entretenimento e hospitalidade entre o titular da compra e o Backstage Karaokê.

---

### 2. CLÁUSULA DE SINAL E GARANTIA DE EXCLUSIVIDADE
2.1. A reserva de salas privadas exige o pagamento prévio de **50% (cinquenta por cento)** do valor total a título de sinal (arras confirmatórias), nos termos do art. 417 do Código Civil Brasileiro.
2.2. O pagamento do sinal gera o bloqueio imediato e irrevogável da data e horário selecionados, impedindo a locação para quaisquer outros grupos.
2.3. Em decorrência da indisponibilização do espaço e dos custos de preparação da sala, **o valor de 50% pago a título de sinal NÃO É REEMBOLSÁVEL** em casos de cancelamento, desistência ou não comparecimento (*no-show*).
2.4. O saldo remanescente de 50% deverá ser pago na recepção do estabelecimento na data agendada, antes do acesso à sala.

---

### 3. CAPACIDADE MÁXIMA E OCUPAÇÃO
3.1. Por razões estritas de segurança, comodidade e normas do Corpo de Bombeiros Militar do DF, cada ambiente possui capacidade máxima inegociável:
- **Sala Red:** até 30 pessoas.
- **Sala Green:** até 40 pessoas.
- **Sala Blue:** até 50 pessoas.
3.2. Não será admitida entrada de número de convidados superior ao limite máximo contratado.

---

### 4. REGRAS DE IDADE, ACESSO E CUMPRIMENTO DO ECA
4.1. **Salão Principal:** Ambiente de convívio geral com classificação interna restrita a **maiores de 18 anos**. É obrigatória a apresentação de documento oficial com foto.
4.2. **Salas Privadas:** É admitida a presença de menores de 18 anos nas salas privativas, **desde que sob a responsabilidade e acompanhamento presencial ininterrupto de seus pais ou responsáveis legais**.
4.3. **Área de Sinuca e Bilhar:** Em cumprimento estrito ao **artigo 80 da Lei Federal nº 8.069/1990 (Estatuto da Criança e do Adolescente - ECA)**, é proibida a entrada e permanência de crianças e adolescentes no espaço que explore comercialmente sinuca ou bilhar, salvo com autorização da autoridade judiciária competente.

---

### 5. HORÁRIOS, TOLERÂNCIA E PERMANÊNCIA
5.1. O estabelecimento opera nos horários oficiais cadastrados (Terça a Sábado, no período noturno/madrugada).
5.2. O grupo tem tolerância máxima de 30 (trinta) minutos para ocupar o espaço reservado.
5.3. O encerramento do funcionamento respeitará impreterivelmente o alvará de funcionamento e horário limite do estabelecimento.

---

### 6. CUIDADOS COM EQUIPAMENTOS E INSTALAÇÕES
6.1. As salas privadas contam com equipamentos audiovisuais de alta performance, microfones profissionais, monitores e tablets digitais.
6.2. O contratante titular é o responsável legal pela integridade dos equipamentos disponibilizados durante o período de locação, comprometendo-se a ressarcir danos decorrentes de dolo ou mau uso.

---

### 7. CANCELAMENTO, FORÇA MAIOR E REMARCAÇÃO
7.1. Solicitações de remarcação de data poderão ser analisadas com antecedência mínima de 72 (setenta e duas) horas, mediante disponibilidade na agenda do Backstage Karaokê.
7.2. O Backstage Karaokê reserva-se o direito de cancelar reservas em caso de motivos de força maior ou problemas técnicos imprevisíveis, assegurando nessa hipótese a restituição integral dos valores pagos pelo cliente ou a remarcação prioritária.
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
