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
      'A locação de salas privadas é realizada mediante pagamento único integral da sala completa no ato da reserva (Sala Red: R$ 800,00; Sala Green: R$ 900,00; Sala Blue: R$ 1.000,00). Não existe sinal de 50% nem saldo para pagar na recepção.',
      'Em caso de cancelamento de sala privada, 50% do valor total corresponde à parcela que poderá não ser reembolsada, observadas a legislação aplicável e as circunstâncias do caso.',
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
 * TERMOS E CONDIÇÕES DE COMPRA E RESERVA OFICIAL
 */
export const TERMOS_COMPRA_RESERVA = `
# TERMOS E CONDIÇÕES DE COMPRA E RESERVA — BACKSTAGE KARAOKÊ

**Versão:** ${VERSAO_DOCUMENTOS}  
**Última atualização:** Outubro de 2026  
**Estabelecimento:** Backstage Karaokê Brasília  
**Endereço:** CLN 307, Bloco A, Subsolo — Asa Norte, Brasília/DF  

---

### 1. OBJETO

1.1. Estes Termos e Condições regulam a contratação de reservas, utilização de salas privativas, espaços e demais serviços disponibilizados pelo Backstage Karaokê Brasília, inclusive por meio de sua plataforma digital.

1.2. Ao concluir uma reserva ou compra, o cliente declara que teve acesso prévio a estes Termos, compreendeu suas condições e concorda com as regras aplicáveis à utilização do estabelecimento.

1.3. A reserva somente será considerada confirmada após a identificação e confirmação do pagamento exigido para a modalidade contratada.

---

### 2. FORMA DE PAGAMENTO E VALORES

2.1. Para a reserva de salas privativas, o valor é fixo e integral para a sala completa, contratado em modalidade de PAGAMENTO ÚNICO INTEGRAL via Pix, Débito ou Cartão de Crédito, sem cobrança por pessoa e sem acréscimo de taxas.

2.2. Nas salas privadas, não há cobrança por pessoa: o valor anunciado e contratado contempla a locação da sala inteira, respeitado o limite de capacidade estabelecido para o espaço.

2.3. Exclusivamente para as mesas do Salão Principal, o valor da entrada é cobrado individualmente por pessoa (R$ 20 via Pix/Débito e R$ 25 via Crédito), garantindo a exclusividade da mesa para o grupo.

2.4. O pagamento integral garante a disponibilidade exclusiva do espaço, data e horário escolhidos pelo cliente.

---

### 3. CANCELAMENTO E REEMBOLSO

3.1. As solicitações de cancelamento deverão ser realizadas pelos canais oficiais disponibilizados pelo Backstage Karaokê.

3.2. Nas contratações realizadas fora do estabelecimento comercial, inclusive por meio do site, é assegurado o direito ao reembolso conforme a legislação e as regras vigentes do estabelecimento.

3.3. Para a reserva de salas privadas, o pagamento é efetuado pelo valor integral da sala no momento da contratação (Sala Red R$ 800,00, Sala Green R$ 900,00, Sala Blue R$ 1.000,00). Não existe cobrança de sinal parcial nem saldo restante para acerto na recepção.

3.4. Em caso de cancelamento de reserva de sala privada solicitado pelo cliente, 50% (cinquenta por cento) do valor total corresponde à parcela que poderá não ser reembolsada, observadas a legislação aplicável e as circunstâncias do caso, destinada a cobrir a retenção por exclusividade e custos de reserva da agenda do estabelecimento. O cliente manifesta seu aceite explícito a esta política antes de efetuar o pagamento.

3.5. Para as reservas de mesas no Salão Principal, cancelamentos comunicados com antecedência observarão a legislação aplicável e as normas vigentes de proteção ao consumidor.

3.6. O não comparecimento do cliente (no-show), sem cancelamento prévio, será tratado conforme as mesmas regras de cancelamento aplicáveis à modalidade contratada.

3.7. Caso o cancelamento ocorra por responsabilidade do Backstage Karaokê, ou quando houver impossibilidade de prestação do serviço por fato imputável ao estabelecimento, serão observados os direitos do consumidor, incluindo, quando cabível, a restituição dos valores pagos ou a remarcação da reserva, conforme acordado com o cliente e a legislação aplicável.

3.8. Situações excepcionais serão analisadas individualmente, especialmente nos casos de força maior ou outras circunstâncias devidamente comprovadas.

---

### 4. REMARCAÇÃO

4.1. O cliente poderá solicitar a remarcação da reserva com antecedência mínima de 72 (setenta e duas) horas, sujeita à disponibilidade de data, horário e espaço.

4.2. A remarcação não será considerada automaticamente confirmada até que o Backstage Karaokê confirme a nova data e horário.

4.3. Eventuais diferenças de valores decorrentes da nova data, horário ou espaço poderão ser aplicadas, desde que previamente informadas ao cliente.

---

### 5. CAPACIDADE DOS ESPAÇOS

5.1. Cada espaço possui capacidade máxima determinada de acordo com suas características, segurança e regras de funcionamento do estabelecimento.

5.2. Os limites de ocupação deverão ser respeitados integralmente e não poderão ser ultrapassados.

5.3. Atualmente, as capacidades máximas informadas para as salas são:
- **Sala Red:** até 30 pessoas;
- **Sala Green:** até 40 pessoas;
- **Sala Blue:** até 50 pessoas.

5.4. O cliente deverá informar corretamente a quantidade de pessoas no momento da reserva.

---

### 6. REGRAS DE IDADE E ACESSO

#### 6.1. Salão Principal
- O Salão Principal é destinado exclusivamente a maiores de 18 anos.
- O estabelecimento poderá solicitar documento oficial com foto para comprovação da idade.

#### 6.2. Salas Privativas
- A presença de menores de 18 anos nas salas privativas será permitida de acordo com as regras do estabelecimento e da legislação aplicável, sendo necessária a presença e responsabilidade do pai, mãe ou responsável legal quando exigida.
- O estabelecimento poderá solicitar documentação para comprovação de identidade, idade e responsabilidade legal.

#### 6.3. Área de sinuca e bilhar
- É expressamente proibida a entrada e permanência de crianças e adolescentes na área destinada à exploração comercial de sinuca, bilhar ou atividades congêneres.
- Essa regra decorre do art. 80 do Estatuto da Criança e do Adolescente (Lei nº 8.069/1990).
- **AVISO IMPORTANTE:** menores de idade não podem entrar ou permanecer na área de sinuca/bilhar.

---

### 7. HORÁRIOS E TOLERÂNCIA

7.1. As reservas deverão respeitar os horários disponibilizados no sistema de reservas.

7.2. Será concedida tolerância de até 30 (trinta) minutos para chegada e ocupação da reserva, salvo condições específicas informadas no momento da contratação.

7.3. A tolerância não implica extensão automática do horário contratado.

7.4. O encerramento das atividades observará os horários de funcionamento e as autorizações legais do estabelecimento.

---

### 8. EQUIPAMENTOS E INSTALAÇÕES

8.1. O cliente deverá utilizar adequadamente os equipamentos, móveis, instalações e demais bens disponibilizados pelo Backstage Karaokê.

8.2. O responsável pela reserva poderá responder pelos danos causados por utilização inadequada, mau uso ou conduta deliberada que resulte em dano ao patrimônio do estabelecimento, observada a legislação aplicável.

---

### 9. RESPONSABILIDADE SOBRE INFORMAÇÕES DA RESERVA

9.1. O titular da reserva é responsável pela veracidade dos dados fornecidos no momento da contratação.

9.2. O titular deverá conferir cuidadosamente data, horário, espaço, quantidade de pessoas e demais informações antes de finalizar a reserva.

9.3. A confirmação da reserva será encaminhada pelos canais disponibilizados pelo estabelecimento.

---

### 10. CANCELAMENTO PELO ESTABELECIMENTO

10.1. Em situações excepcionais que impossibilitem a prestação do serviço, incluindo problemas técnicos graves, determinações de autoridades, situações de força maior ou outras circunstâncias alheias ao controle razoável do estabelecimento, o Backstage Karaokê poderá cancelar ou remarcar a reserva.

10.2. Nesses casos, o cliente será comunicado e serão observadas as alternativas e direitos previstos na legislação aplicável, podendo ser oferecida remarcação ou restituição dos valores pagos, conforme o caso.

---

### 11. ACEITE DOS TERMOS

11.1. Antes de concluir uma reserva ou compra pelo site, o cliente deverá ter acesso a estes Termos e manifestar sua concordância quando exigido.

11.2. O aceite destes Termos não afasta nem limita os direitos assegurados ao consumidor pela legislação brasileira.

---

### 12. PROTEÇÃO DE DADOS

12.1. Os dados pessoais fornecidos durante a reserva serão tratados de acordo com a legislação aplicável de proteção de dados e com a Política de Privacidade do Backstage Karaokê.

12.2. O estabelecimento deverá disponibilizar ao cliente informações sobre a finalidade, utilização, armazenamento e demais aspectos relacionados ao tratamento de seus dados pessoais.

---

### 13. DISPOSIÇÕES FINAIS

13.1. Estes Termos deverão ser interpretados em conjunto com a Política de Privacidade, regras de utilização dos espaços e demais informações apresentadas ao cliente no momento da contratação.

13.2. Em caso de conflito entre uma disposição destes Termos e uma norma legal de proteção ao consumidor aplicável ao caso, prevalecerá a legislação vigente.

13.3. O Backstage Karaokê poderá atualizar estes Termos sempre que necessário, mantendo disponível a versão vigente em seu site.
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
