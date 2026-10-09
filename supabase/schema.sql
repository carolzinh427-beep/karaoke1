-- ==============================================================================
-- BACKSTAGE KARAOKÊ — ESQUEMA COMPLETO DO BANCO DE DADOS (SUPABASE POSTGRESQL)
-- ==============================================================================
-- Execute este script completo no SQL Editor do seu projeto Supabase.
-- Ele cria todas as tabelas, índices, políticas de segurança (RLS) e popula
-- os dados oficiais (salas, categorias, cardápio com 77 itens e configurações).
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função utilitária para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------------------------
-- 2. TABELA: SALAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL,
    capacidade INTEGER NOT NULL DEFAULT 30,
    preco_total NUMERIC(10,2) NOT NULL DEFAULT 800.00,
    sinal NUMERIC(10,2) NOT NULL DEFAULT 400.00,
    restante NUMERIC(10,2) NOT NULL DEFAULT 400.00,
    descricao TEXT DEFAULT '',
    imagem TEXT DEFAULT '/assets/brand/hero-bg.webp',
    public_id TEXT DEFAULT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_salas_updated_at ON public.salas;
CREATE TRIGGER trigger_salas_updated_at
    BEFORE UPDATE ON public.salas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 3. TABELA: CATEGORIAS DO CARDÁPIO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categorias_cardapio (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 1,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_categorias_updated_at ON public.categorias_cardapio;
CREATE TRIGGER trigger_categorias_updated_at
    BEFORE UPDATE ON public.categorias_cardapio
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 4. TABELA: ITENS DO CARDÁPIO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cardapio (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    preco NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    categoria_id TEXT REFERENCES public.categorias_cardapio(id) ON UPDATE CASCADE ON DELETE SET NULL,
    categoria TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    imagem TEXT DEFAULT '',
    imagem_public_id TEXT DEFAULT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cardapio_categoria ON public.cardapio(categoria_id);
CREATE INDEX IF NOT EXISTS idx_cardapio_ordem ON public.cardapio(ordem);

DROP TRIGGER IF EXISTS trigger_cardapio_updated_at ON public.cardapio;
CREATE TRIGGER trigger_cardapio_updated_at
    BEFORE UPDATE ON public.cardapio
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 5. TABELA: GALERIA DE MÍDIA (FOTOS E VÍDEOS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galeria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL DEFAULT 'imagem', -- 'imagem' ou 'video'
    sala TEXT NOT NULL DEFAULT 'geral',   -- 'sala-red', 'sala-green', 'sala-blue' ou 'geral'
    titulo TEXT DEFAULT '',
    url TEXT NOT NULL,
    public_id TEXT DEFAULT NULL,
    formato TEXT DEFAULT NULL,
    largura INTEGER DEFAULT NULL,
    altura INTEGER DEFAULT NULL,
    duracao NUMERIC(10,2) DEFAULT NULL,
    tamanho_bytes BIGINT DEFAULT NULL,
    nome_arquivo TEXT DEFAULT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galeria_sala ON public.galeria(sala);
CREATE INDEX IF NOT EXISTS idx_galeria_ordem ON public.galeria(ordem);

DROP TRIGGER IF EXISTS trigger_galeria_updated_at ON public.galeria;
CREATE TRIGGER trigger_galeria_updated_at
    BEFORE UPDATE ON public.galeria
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- ------------------------------------------------------------------------------
-- 6. TABELA: AMBIENTES E ESPAÇOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ambientes (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'aberto', 'privado', 'jogos'
    faixa_etaria TEXT NOT NULL,
    permite_menor BOOLEAN NOT NULL DEFAULT FALSE,
    capacidade_maxima INTEGER NOT NULL DEFAULT 40,
    valor_base NUMERIC(10,2) DEFAULT 0,
    descricao TEXT DEFAULT '',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. TABELA: RESERVAS E AGENDAMENTOS (EXPANDIDA COM CONFORMIDADE LEGAL)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_reserva VARCHAR(20) UNIQUE,
    nome TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT DEFAULT NULL,
    data TEXT NOT NULL,               -- Formato YYYY-MM-DD
    horario TEXT DEFAULT '19:00',
    ambiente_id TEXT DEFAULT 'salas-privadas',
    sala_ou_mesa TEXT DEFAULT '',
    sala TEXT NOT NULL,               -- Retrocompatibilidade com salas
    pessoas INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN'
    status_pagamento TEXT NOT NULL DEFAULT 'aguardando', -- 'aguardando', 'aprovado', 'recusado'
    transacao_id TEXT DEFAULT NULL,
    qr_code_token TEXT UNIQUE DEFAULT NULL,
    valor_total NUMERIC(10,2) DEFAULT NULL,
    valor_sinal NUMERIC(10,2) DEFAULT NULL,
    valor_pago NUMERIC(10,2) DEFAULT NULL,
    termos_aceitos BOOLEAN NOT NULL DEFAULT TRUE,
    termos_aceitos_em TIMESTAMPTZ DEFAULT NOW(),
    termos_versao TEXT DEFAULT '2026.1',
    consentimento_marketing BOOLEAN NOT NULL DEFAULT FALSE,
    presenca_menor BOOLEAN NOT NULL DEFAULT FALSE,
    responsavel_legal_declarado BOOLEAN NOT NULL DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ DEFAULT NULL,
    observacoes TEXT DEFAULT '',
    origem TEXT NOT NULL DEFAULT 'site_cliente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração de colunas caso a tabela já exista
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS codigo_reserva VARCHAR(20) UNIQUE;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS horario TEXT DEFAULT '19:00';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS ambiente_id TEXT DEFAULT 'salas-privadas';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS sala_ou_mesa TEXT DEFAULT '';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'aguardando';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS transacao_id TEXT DEFAULT NULL;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS qr_code_token TEXT UNIQUE DEFAULT NULL;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS termos_aceitos_em TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS termos_versao TEXT DEFAULT '2026.1';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS consentimento_marketing BOOLEAN DEFAULT FALSE;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS presenca_menor BOOLEAN DEFAULT FALSE;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS responsavel_legal_declarado BOOLEAN DEFAULT FALSE;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_reservas_data ON public.reservas(data);
CREATE INDEX IF NOT EXISTS idx_reservas_status ON public.reservas(status);
CREATE INDEX IF NOT EXISTS idx_reservas_codigo ON public.reservas(codigo_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_email ON public.reservas(email);

DROP TRIGGER IF EXISTS trigger_reservas_updated_at ON public.reservas;
CREATE TRIGGER trigger_reservas_updated_at
    BEFORE UPDATE ON public.reservas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 8. TABELA: HISTÓRICO DE PAGAMENTOS SEGUROS (PCI-DSS & LGPD)
-- ------------------------------------------------------------------------------
-- Nunca armazena dados de cartão (número, CVV, senhas).
CREATE TABLE IF NOT EXISTS public.pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE CASCADE,
    codigo_reserva VARCHAR(20) NOT NULL,
    gateway TEXT NOT NULL DEFAULT 'gateway_independente',
    transacao_id TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    metodo TEXT NOT NULL DEFAULT 'pix', -- 'pix', 'cartao_credito'
    status TEXT NOT NULL DEFAULT 'aguardando', -- 'aguardando', 'aprovado', 'recusado'
    comprador_email TEXT DEFAULT NULL,
    pago_em TIMESTAMPTZ DEFAULT NULL,
    metadata_seguro JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_reserva ON public.pagamentos(reserva_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_transacao ON public.pagamentos(transacao_id);

-- ------------------------------------------------------------------------------
-- 9. TABELA: AUDITORIA DE CONSENTIMENTOS E ACEITE (LGPD)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registros_consentimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    tipo_documento TEXT NOT NULL, -- 'termos_compra', 'politica_privacidade', 'marketing'
    versao TEXT NOT NULL DEFAULT '2026.1',
    aceito BOOLEAN NOT NULL DEFAULT TRUE,
    ip_hash TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consentimentos_email ON public.registros_consentimento(email);


-- ------------------------------------------------------------------------------
-- 7. TABELA: BLOQUEIOS DE DATAS E SALAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bloqueios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'dia_inteiro',
    sala TEXT NOT NULL DEFAULT 'todas',
    horario TEXT DEFAULT 'Dia Inteiro',
    motivo TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_bloqueios_updated_at ON public.bloqueios;
CREATE TRIGGER trigger_bloqueios_updated_at
    BEFORE UPDATE ON public.bloqueios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 8. TABELA: CONFIGURAÇÕES GERAIS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id TEXT PRIMARY KEY DEFAULT 'geral',
    whatsapp TEXT DEFAULT '556181426321',
    instagram TEXT DEFAULT '@backstagekaraoke',
    maps_url TEXT DEFAULT 'https://maps.app.goo.gl/AwFhL4Z4Au6cqu4v6',
    endereco TEXT DEFAULT 'CLN 307, Bloco A, Subsolo - Asa Norte, Brasília - DF',
    contato_email TEXT DEFAULT '',
    pdf_url TEXT DEFAULT '/cardapio-oficial.pdf',
    pdf_public_id TEXT DEFAULT NULL,
    horarios JSONB NOT NULL DEFAULT '{
        "terca": "19:00 → 02:30 (madrugada de quarta)",
        "quarta": "19:00 → 03:30 (madrugada de quinta)",
        "quinta": "19:00 → 03:30 (madrugada de sexta)",
        "sexta": "18:30 → 04:00 (madrugada de sábado)",
        "sabado": "18:30 → 04:00 (madrugada de domingo)",
        "domingo": "Fechado ao público (Disponível sob consulta no WhatsApp)",
        "segunda": "Fechado ao público (Disponível sob consulta no WhatsApp)"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrações idempotentes de colunas caso a tabela configuracoes já exista
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS contato_email TEXT DEFAULT 'contato@barbackstagekaraoke.com.br';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS pdf_public_id TEXT DEFAULT NULL;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS pdf_url TEXT DEFAULT '/cardapio-oficial.pdf';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS endereco TEXT DEFAULT 'CLN 307, Bloco A, Subsolo - Asa Norte, Brasília - DF';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS maps_url TEXT DEFAULT 'https://maps.app.goo.gl/AwFhL4Z4Au6cqu4v6';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS horarios JSONB DEFAULT '{}'::jsonb;

DROP TRIGGER IF EXISTS trigger_configuracoes_updated_at ON public.configuracoes;
CREATE TRIGGER trigger_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) & POLÍTICAS DE ACESSO
-- ------------------------------------------------------------------------------
-- Habilita RLS em todas as tabelas
ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_cardapio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardapio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas para Salas (Leitura pública irrestrita; Escrita pelo painel)
DROP POLICY IF EXISTS "Salas leitura pública" ON public.salas;
CREATE POLICY "Salas leitura pública" ON public.salas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Salas escrita painel" ON public.salas;
CREATE POLICY "Salas escrita painel" ON public.salas FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Categorias
DROP POLICY IF EXISTS "Categorias leitura pública" ON public.categorias_cardapio;
CREATE POLICY "Categorias leitura pública" ON public.categorias_cardapio FOR SELECT USING (true);
DROP POLICY IF EXISTS "Categorias escrita painel" ON public.categorias_cardapio;
CREATE POLICY "Categorias escrita painel" ON public.categorias_cardapio FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Cardápio
DROP POLICY IF EXISTS "Cardápio leitura pública" ON public.cardapio;
CREATE POLICY "Cardápio leitura pública" ON public.cardapio FOR SELECT USING (true);
DROP POLICY IF EXISTS "Cardápio escrita painel" ON public.cardapio;
CREATE POLICY "Cardápio escrita painel" ON public.cardapio FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Galeria
DROP POLICY IF EXISTS "Galeria leitura pública" ON public.galeria;
CREATE POLICY "Galeria leitura pública" ON public.galeria FOR SELECT USING (true);
DROP POLICY IF EXISTS "Galeria escrita painel" ON public.galeria;
CREATE POLICY "Galeria escrita painel" ON public.galeria FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Reservas (Criação pelo site + Gestão pelo painel)
DROP POLICY IF EXISTS "Reservas inserção pública" ON public.reservas;
CREATE POLICY "Reservas inserção pública" ON public.reservas FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Reservas leitura painel" ON public.reservas;
CREATE POLICY "Reservas leitura painel" ON public.reservas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Reservas atualização painel" ON public.reservas;
CREATE POLICY "Reservas atualização painel" ON public.reservas FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Reservas exclusão painel" ON public.reservas;
CREATE POLICY "Reservas exclusão painel" ON public.reservas FOR DELETE USING (true);

-- Políticas para Bloqueios
DROP POLICY IF EXISTS "Bloqueios leitura pública" ON public.bloqueios;
CREATE POLICY "Bloqueios leitura pública" ON public.bloqueios FOR SELECT USING (true);
DROP POLICY IF EXISTS "Bloqueios escrita painel" ON public.bloqueios FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Configurações (Leitura pública irrestrita; Edição pelo painel administrativo)
GRANT SELECT, INSERT, UPDATE ON public.configuracoes TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Configurações leitura pública" ON public.configuracoes;
CREATE POLICY "Configurações leitura pública" ON public.configuracoes FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Configurações escrita painel" ON public.configuracoes;
CREATE POLICY "Configurações escrita painel" ON public.configuracoes FOR ALL TO public USING (true) WITH CHECK (true);

-- Políticas para Ambientes
ALTER TABLE public.ambientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ambientes leitura pública" ON public.ambientes;
CREATE POLICY "Ambientes leitura pública" ON public.ambientes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Ambientes escrita painel" ON public.ambientes;
CREATE POLICY "Ambientes escrita painel" ON public.ambientes FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Pagamentos (PCI-DSS & LGPD)
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pagamentos inserção pública" ON public.pagamentos;
CREATE POLICY "Pagamentos inserção pública" ON public.pagamentos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Pagamentos leitura painel" ON public.pagamentos;
CREATE POLICY "Pagamentos leitura painel" ON public.pagamentos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Pagamentos atualização painel" ON public.pagamentos;
CREATE POLICY "Pagamentos atualização painel" ON public.pagamentos FOR UPDATE USING (true) WITH CHECK (true);

-- Políticas para Registros de Consentimento (Auditoria LGPD)
ALTER TABLE public.registros_consentimento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Consentimentos inserção pública" ON public.registros_consentimento;
CREATE POLICY "Consentimentos inserção pública" ON public.registros_consentimento FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Consentimentos leitura painel" ON public.registros_consentimento;
CREATE POLICY "Consentimentos leitura painel" ON public.registros_consentimento FOR SELECT USING (true);


-- ------------------------------------------------------------------------------
-- 10. POVOAMENTO INICIAL (SEED OFICIAL)
-- ------------------------------------------------------------------------------

-- Inserção dos Ambientes Regulamentados
INSERT INTO public.ambientes (id, nome, tipo, faixa_etaria, permite_menor, capacidade_maxima, valor_base, descricao, ativo)
VALUES
    ('salao-principal', 'Salão Principal (Palco & Bar)', 'aberto', '18+ (Classificação Indicativa Estrita)', false, 80, 0.00, 'Ambiente vibrante com palco integrado de karaokê, mesas e bar. Entrada e permanência restritas a maiores de 18 anos.', true),
    ('salas-privadas', 'Salas Privativas VIP (Red, Green, Blue)', 'privado', 'Livre com Responsável Legal', true, 50, 400.00, 'Salas privativas acústicas exclusivas com som profissional. Entrada de menores permitida exclusivamente com a presença e vigilância contínua do responsável legal.', true),
    ('sinuca-bilhar', 'Área de Jogos, Sinuca & Bilhar', 'jogos', '18+ (Art. 80 do ECA - Lei 8.069/1990)', false, 20, 0.00, 'Mesas profissionais de bilhar. Proibida a entrada e permanência de crianças e adolescentes nos termos do Artigo 80 do Estatuto da Criança e do Adolescente.', true)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    faixa_etaria = EXCLUDED.faixa_etaria,
    permite_menor = EXCLUDED.permite_menor,
    descricao = EXCLUDED.descricao;

-- Inserção das 3 Salas Oficiais
INSERT INTO public.salas (id, nome, slug, capacidade, preco_total, sinal, restante, descricao, imagem, ativo, ordem)
VALUES
    ('sala-red', 'Sala Red', 'sala-red', 30, 800.00, 800.00, 0.00, 'Ambiente intimista e vibrante com iluminação vermelha cênica.', '/assets/brand/hero-bg.webp', true, 1),
    ('sala-green', 'Sala Green', 'sala-green', 40, 900.00, 900.00, 0.00, 'Recomendado entre 30 e 35 pessoas para maior conforto.', '/assets/drinks/aperol-spritz.webp', true, 2),
    ('sala-blue', 'Sala Blue', 'sala-blue', 50, 1000.00, 1000.00, 0.00, 'Nossa maior sala vip com capacidade estendida e sistema premium.', '/assets/brand/microfone-profissional.jpg', true, 3)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    capacidade = EXCLUDED.capacidade,
    preco_total = EXCLUDED.preco_total,
    sinal = EXCLUDED.sinal,
    restante = EXCLUDED.restante,
    descricao = EXCLUDED.descricao;

-- Inserção das Categorias do Cardápio
INSERT INTO public.categorias_cardapio (id, nome, ordem, ativo)
VALUES
    ('petiscos', 'Porções & Petiscos', 1, true),
    ('coqueteis-alcool', 'Coquetéis com Álcool', 2, true),
    ('cervejas', 'Cervejas & Chopp', 3, true),
    ('drinks-especiais', 'Drinks Especiais', 4, true),
    ('caipiras', 'Caipiras & Autorais', 5, true),
    ('sem-alcool', 'Sem Álcool', 6, true),
    ('whisky', 'Whisky & Combos', 7, true),
    ('destilados', 'Destilados & Licores', 8, true),
    ('bebidas', 'Bebidas Gerais', 9, true)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    ordem = EXCLUDED.ordem;

-- Inserção dos 77 Itens Oficiais do Cardápio
INSERT INTO public.cardapio (id, nome, preco, categoria_id, categoria, descricao, ativo, ordem)
VALUES
    -- 1. Porções & Petiscos
    ('bolinho-bacalhau', 'Bolinho de Bacalhau', 36.99, 'petiscos', 'Porções & Petiscos', 'Clássico porção crocante e bem temperada', true, 1),
    ('batata-frita', 'Batata Frita', 24.99, 'petiscos', 'Porções & Petiscos', 'Porção generosa e sequinha', true, 2),
    ('batata-cheddar-bacon', 'Batata com Cheddar e Bacon', 49.99, 'petiscos', 'Porções & Petiscos', 'Batatas crocantes cobertas com cheddar cremoso e cubos de bacon', true, 3),
    ('mandioca-frita', 'Mandioca Frita', 19.99, 'petiscos', 'Porções & Petiscos', 'Mandioca macia por dentro e dourada por fora', true, 4),
    ('calabresa-acebolada', 'Calabresa Acebolada', 39.99, 'petiscos', 'Porções & Petiscos', 'Fatias de calabresa refogadas com cebolas douradas', true, 5),
    ('bolinho-queijo', 'Bolinho de Queijo (20 unidades)', 29.99, 'petiscos', 'Porções & Petiscos', 'Salgadinhos crocantes com recheio de queijo derretido', true, 6),
    ('pastel-carne-queijo', 'Pastel de Carne ou Queijo (20 unidades)', 29.99, 'petiscos', 'Porções & Petiscos', 'Mini pastéis fritos na hora', true, 7),
    ('coxinha-frango', 'Coxinha de Frango (20 unidades)', 29.99, 'petiscos', 'Porções & Petiscos', 'Massa saborosa com recheio desfiado cremoso', true, 8),
    ('kibe', 'Kibe (20 unidades)', 29.99, 'petiscos', 'Porções & Petiscos', 'Tradicional kibe frito temperado', true, 9),
    ('file-tilapia', 'Filé de Tilápia', 69.99, 'petiscos', 'Porções & Petiscos', 'Iscas empanadas crocantes (acompanhamentos inclusos)', true, 10),
    ('frango-passarinho', 'Frango a Passarinho', 44.99, 'petiscos', 'Porções & Petiscos', 'Crocante com alho frito e acompanhamentos', true, 11),
    ('costelinha-barbecue', 'Costelinha Suína com Barbecue', 44.99, 'petiscos', 'Porções & Petiscos', 'Costela macia caramelizada com molho barbecue', true, 12),
    ('carne-sol', 'Carne de Sol (c/ mandioca ou batata)', 69.99, 'petiscos', 'Porções & Petiscos', 'Carne de sol no ponto ideal com acompanhamento', true, 13),
    ('picanha-500g', 'Picanha 500g (c/ mandioca ou batata)', 89.99, 'petiscos', 'Porções & Petiscos', 'Corte nobre grelhado acompanhado de mandioca ou batata', true, 14),
    ('caldos-quentinhos', 'Caldos Quentinhos', 24.99, 'petiscos', 'Porções & Petiscos', 'Sabores: Carne, Feijão, Verde e Frango', true, 15),
    ('combo-misto-bom', 'Combo Misto Bom', 29.99, 'petiscos', 'Porções & Petiscos', '10 salgadinhos (misto) + Batata Frita + Molho Especial', true, 16),
    ('combo-escolha-perfeita', 'Combo Escolha Perfeita', 29.99, 'petiscos', 'Porções & Petiscos', '16 salgadinhos (misto) + 1 Molho (Rosé, Barbecue ou Tártaro)', true, 17),

    -- 2. Coquetéis com Álcool
    ('aperol-spritz', 'Aperol Spritz', 29.99, 'coqueteis-alcool', 'Coquetéis com Álcool', 'Aperol, espumante brut e água com gás', true, 18),
    ('mojito', 'Mojito', 28.99, 'coqueteis-alcool', 'Coquetéis com Álcool', 'Rum, açúcar, suco de limão, água com gás e hortelã', true, 19),
    ('margarita', 'Margarita', 34.99, 'coqueteis-alcool', 'Coquetéis com Álcool', 'Tequila prata, Cointreau e suco de limão', true, 20),
    ('negroni', 'Negroni', 39.99, 'coqueteis-alcool', 'Coquetéis com Álcool', 'Vermute tinto, Campari e gin', true, 21),
    ('tequila-sunrise', 'Tequila Sunrise', 32.99, 'coqueteis-alcool', 'Coquetéis com Álcool', 'Tequila, suco de laranja e xarope de groselha', true, 22),
    ('cosmopolitan', 'Cosmopolitan', 32.99, 'coqueteis-alcool', 'Coquetéis com Álcool', 'Vodka, cranberry, licor de laranja e limão', true, 23),
    ('pina-colada', 'Piña Colada Refrescante', 32.99, 'coqueteis-alcool', 'Coquetéis com Álcool', 'Rum branco, leite de coco, leite condensado e abacaxi', true, 24),
    ('cozumel', 'Cozumel', 19.99, 'coqueteis-alcool', 'Coquetéis com Álcool', 'Cerveja clara, borda de sal e limão', true, 25),
    ('preparo-cozumel', 'Preparo do Cozumel', 8.00, 'coqueteis-alcool', 'Coquetéis com Álcool', 'Preparo avulso', true, 26),
    ('shot-limao', 'Shot de Limão', 2.00, 'coqueteis-alcool', 'Coquetéis com Álcool', 'Dose rápida', true, 27),

    -- 3. Cervejas & Chopp
    ('heineken-long-neck', 'Heineken Long Neck', 14.99, 'cervejas', 'Cervejas & Chopp', 'Cerveja Premium 330ml gelada', true, 28),
    ('corona-long-neck', 'Corona Long Neck', 14.99, 'cervejas', 'Cervejas & Chopp', 'Cerveja clara suave com rodela de limão', true, 29),
    ('stella-pure-gold', 'Stella Pure Gold Long Neck', 14.99, 'cervejas', 'Cervejas & Chopp', 'Sem glúten com todo o sabor', true, 30),
    ('stella-artois', 'Stella Artois Long Neck', 11.99, 'cervejas', 'Cervejas & Chopp', 'Clássica lager belga', true, 31),
    ('spaten-long-neck', 'Spaten Long Neck', 11.99, 'cervejas', 'Cervejas & Chopp', 'Puro malte alemã tradicional', true, 32),
    ('budweiser-long-neck', 'Budweiser Long Neck', 10.99, 'cervejas', 'Cervejas & Chopp', 'King of Beers gelada', true, 33),
    ('chopp-stone-house', 'Chopp Stone House', 9.99, 'cervejas', 'Cervejas & Chopp', 'Gelado na caneca congelada', true, 34),

    -- 4. Drinks Especiais
    ('moscow-mule', 'Moscow Mule', 32.99, 'drinks-especiais', 'Drinks Especiais', 'Vodka, limão, xarope de açúcar e espuma artesanal de gengibre', true, 35),
    ('tesourinha-bsb', 'Tesourinha BSB', 24.99, 'drinks-especiais', 'Drinks Especiais', 'Homenagem à capital: Vodka, gengibre, limão, guaraná e canela', true, 36),
    ('back-milk-alcool', 'Back & Milk - Estrela da Casa (Com Álcool)', 39.99, 'drinks-especiais', 'Drinks Especiais', 'Drink assinatura autoral do Backstage', true, 37),
    ('back-milk-sem-alcool', 'Back & Milk - Estrela da Casa (Sem Álcool)', 29.99, 'drinks-especiais', 'Drinks Especiais', 'Versão suave sem teor alcoólico', true, 38),
    ('bombeirinho', 'Bombeirinho', 9.99, 'drinks-especiais', 'Drinks Especiais', 'Cachaça, limão tahiti e groselha', true, 39),
    ('cuba-libre', 'Cuba Libre', 24.99, 'drinks-especiais', 'Drinks Especiais', 'Rum, Coca-Cola e limão', true, 40),
    ('mix-frutas-gin', 'Mix de Frutas com Gin', 24.99, 'drinks-especiais', 'Drinks Especiais', 'Frutas, xarope de frutas vermelhas, Sprite e gin', true, 41),
    ('sex-on-the-beach', 'Sex on the Beach', 34.99, 'drinks-especiais', 'Drinks Especiais', 'Vodka, laranja, licor de pêssego e groselha', true, 42),
    ('so-o-ouro', 'Só o Ouro - Shot', 14.99, 'drinks-especiais', 'Drinks Especiais', 'Cachaça de banana, limão e espuma de baunilha', true, 43),
    ('espumante-casa-valduga', 'Espumante Casa Valduga', 159.99, 'drinks-especiais', 'Drinks Especiais', 'Garrafa premium para brindar', true, 44),
    ('espumante-salton', 'Espumante Salton', 89.99, 'drinks-especiais', 'Drinks Especiais', 'Garrafa selecionada para comemorações', true, 45),
    ('espumante-aurora', 'Espumante Aurora', 79.99, 'drinks-especiais', 'Drinks Especiais', 'Garrafa gelada refrescante', true, 46),

    -- 5. Caipiras & Autorais
    ('sakerinha', 'Sakerinha', 41.99, 'caipiras', 'Caipiras & Autorais', 'Saquê e frutas frescas da estação', true, 47),
    ('caipirinha-tradicional', 'Caipirinha Tradicional', 15.99, 'caipiras', 'Caipiras & Autorais', 'Cachaça 51, limão e açúcar', true, 48),
    ('caipirosca-1', 'Caipirosca I', 24.99, 'caipiras', 'Caipiras & Autorais', 'Vodka, morango e abacaxi', true, 49),
    ('caipirosca-2', 'Caipirosca II', 29.99, 'caipiras', 'Caipiras & Autorais', 'Vodka, caju e laranja', true, 50),
    ('camara', 'Camará', 19.99, 'caipiras', 'Caipiras & Autorais', 'Caipirinha especial de limão com rapadura', true, 51),
    ('catetinha', 'Catetinha', 19.99, 'caipiras', 'Caipiras & Autorais', 'Caipirinha de maracujá com canela', true, 52),
    ('caipice-lemon', 'Caipicé Lemon', 24.99, 'caipiras', 'Caipiras & Autorais', 'Vodka, limão siciliano e hortelã', true, 53),

    -- 6. Sem Álcool
    ('coquetel-frutas-sem', 'Coquetel de Frutas', 31.99, 'sem-alcool', 'Sem Álcool', 'Frutas vermelhas, leite condensado e soda', true, 54),
    ('soda-italiana', 'Soda Italiana', 19.99, 'sem-alcool', 'Sem Álcool', 'Água com gás e xarope premium à escolha', true, 55),
    ('moda-da-casa', 'Moda da Casa', 24.99, 'sem-alcool', 'Sem Álcool', 'Frutas vermelhas, morango, gengibre e água tônica', true, 56),
    ('mix-frutas-sem', 'Mix de Frutas', 19.99, 'sem-alcool', 'Sem Álcool', 'Frutas, xarope de frutas vermelhas e Sprite', true, 57),

    -- 7. Whisky & Combos
    ('chivas-dose', 'Chivas Regal (Dose)', 27.99, 'whisky', 'Whisky & Combos', 'Dose pura ou com gelo', true, 58),
    ('old-parr-dose', 'Old Parr (Dose)', 24.99, 'whisky', 'Whisky & Combos', 'Dose pura ou com gelo', true, 59),
    ('red-label-dose', 'Red Label (Dose)', 19.99, 'whisky', 'Whisky & Combos', 'Dose pura ou com gelo', true, 60),
    ('black-label-dose', 'Black Label (Dose)', 39.99, 'whisky', 'Whisky & Combos', 'Dose 12 anos', true, 61),
    ('jack-daniels-dose', 'Jack Daniel''s (Dose)', 24.99, 'whisky', 'Whisky & Combos', 'Tennessee Whiskey', true, 62),
    ('buchanans-dose', 'Buchanan''s (Dose)', 24.99, 'whisky', 'Whisky & Combos', 'Dose 12 anos', true, 63),
    ('combo-chivas', 'Combo Chivas Regal', 389.99, 'whisky', 'Whisky & Combos', 'Garrafa + 4 Red Bulls + 1 Água de Coco', true, 64),
    ('combo-old-parr', 'Combo Old Parr', 399.99, 'whisky', 'Whisky & Combos', 'Garrafa + 4 Red Bulls + 1 Água de Coco', true, 65),
    ('combo-red-label', 'Combo Red Label', 280.99, 'whisky', 'Whisky & Combos', 'Garrafa + 4 Red Bulls + 1 Água de Coco', true, 66),
    ('combo-black-label', 'Combo Black Label', 451.99, 'whisky', 'Whisky & Combos', 'Garrafa + 4 Red Bulls + 1 Água de Coco', true, 67),
    ('combo-jack-daniels', 'Combo Jack Daniel''s', 389.99, 'whisky', 'Whisky & Combos', 'Garrafa + 4 Red Bulls + 1 Água de Coco', true, 68),
    ('combo-buchanans', 'Combo Buchanan''s', 589.99, 'whisky', 'Whisky & Combos', 'Garrafa + 4 Red Bulls + 1 Água de Coco', true, 69),
    ('combo-smirnoff', 'Combo Smirnoff', 219.99, 'whisky', 'Whisky & Combos', 'Garrafa + 4 Red Bulls + 1 Água de Coco', true, 70),
    ('combo-absolut', 'Combo Absolut', 314.99, 'whisky', 'Whisky & Combos', 'Garrafa + 4 Red Bulls + 1 Água de Coco', true, 71),
    ('combo-tanqueray', 'Combo Tanqueray', 381.99, 'whisky', 'Whisky & Combos', 'Garrafa + 4 Red Bulls + 1 Água de Coco', true, 72),
    ('balde-budweiser', 'Balde Budweiser (6 unidades)', 59.99, 'whisky', 'Whisky & Combos', '6 long necks super geladas no balde com gelo', true, 73),

    -- 8. Destilados & Licores
    ('tanqueray-dose', 'Tanqueray (Dose)', 24.99, 'destilados', 'Destilados & Licores', 'London Dry Gin', true, 74),
    ('absolut-dose', 'Absolut (Dose)', 22.99, 'destilados', 'Destilados & Licores', 'Vodka sueca pura', true, 75),
    ('jose-cuervo-dose', 'José Cuervo (Dose)', 27.99, 'destilados', 'Destilados & Licores', 'Tequila mexicana com sal e limão', true, 76),
    ('licor-43-dose', 'Licor 43 (Dose)', 24.99, 'destilados', 'Destilados & Licores', 'Licor espanhol aromático', true, 77),
    ('amarula-dose', 'Amarula (Dose)', 19.99, 'destilados', 'Destilados & Licores', 'Licor cremoso de marula', true, 78),
    ('smirnoff-dose', 'Smirnoff (Dose)', 14.99, 'destilados', 'Destilados & Licores', 'Vodka destilada', true, 79),
    ('campari-dose', 'Campari (Dose)', 13.99, 'destilados', 'Destilados & Licores', 'Bitter italiano com laranja', true, 80),
    ('cortezano-dose', 'Cortezano (Dose)', 14.99, 'destilados', 'Destilados & Licores', 'Conhaque nacional', true, 81),
    ('sagatiba-dose', 'Sagatiba (Dose)', 11.99, 'destilados', 'Destilados & Licores', 'Cachaça pura', true, 82),
    ('salinas-dose', 'Salinas (Dose)', 11.99, 'destilados', 'Destilados & Licores', 'Cachaça artesanal de alambique', true, 83),
    ('bananinha-dose', 'Bananinha (Dose)', 11.99, 'destilados', 'Destilados & Licores', 'Aroma adocicado de banana', true, 84),
    ('sao-francisco-dose', 'São Francisco (Dose)', 10.99, 'destilados', 'Destilados & Licores', 'Cachaça tradicional', true, 85),
    ('domecq-dose', 'Domecq (Dose)', 11.99, 'destilados', 'Destilados & Licores', 'Conhaque clássico', true, 86),
    ('montilla-dose', 'Montilla (Dose)', 11.99, 'destilados', 'Destilados & Licores', 'Rum carta branca', true, 87),
    ('cachaca-canastra-dose', 'Cachaça Canastra (Dose)', 9.99, 'destilados', 'Destilados & Licores', 'Cachaça mineira nobre', true, 88),

    -- 9. Bebidas Gerais
    ('agua-sem-gas', 'Água sem gás', 5.99, 'bebidas', 'Bebidas Gerais', 'Garrafa 500ml', true, 89),
    ('agua-com-gas', 'Água com gás', 6.99, 'bebidas', 'Bebidas Gerais', 'Garrafa 500ml com limão', true, 90),
    ('coca-cola', 'Coca-Cola', 7.99, 'bebidas', 'Bebidas Gerais', 'Lata 350ml', true, 91),
    ('coca-cola-zero', 'Coca-Cola Zero', 7.99, 'bebidas', 'Bebidas Gerais', 'Lata 350ml zero açúcar', true, 92),
    ('guarana', 'Guaraná Antarctica', 7.99, 'bebidas', 'Bebidas Gerais', 'Lata 350ml', true, 93),
    ('pepsi-zero', 'Pepsi Black Zero', 6.99, 'bebidas', 'Bebidas Gerais', 'Lata 350ml', true, 94),
    ('schweppes', 'Schweppes Citrus', 7.99, 'bebidas', 'Bebidas Gerais', 'Lata 350ml', true, 95),
    ('agua-tonica', 'Água Tônica Antarctica', 7.99, 'bebidas', 'Bebidas Gerais', 'Lata 350ml', true, 96),
    ('agua-coco-pequena', 'Água de Coco (Pequena)', 9.99, 'bebidas', 'Bebidas Gerais', '200ml gelada', true, 97),
    ('agua-coco-grande', 'Água de Coco (Grande)', 19.99, 'bebidas', 'Bebidas Gerais', '1 Litro gelada', true, 98),
    ('red-bull', 'Red Bull Energy Drink', 17.99, 'bebidas', 'Bebidas Gerais', 'Lata 250ml', true, 99),
    ('beats', 'Beats (Sabores)', 13.99, 'bebidas', 'Bebidas Gerais', 'Long neck ou lata sabores sortidos', true, 100),
    ('ice-smirnoff', 'Ice Smirnoff', 12.99, 'bebidas', 'Bebidas Gerais', 'Long neck gelada', true, 101)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    preco = EXCLUDED.preco,
    categoria_id = EXCLUDED.categoria_id,
    categoria = EXCLUDED.categoria,
    descricao = EXCLUDED.descricao;

-- Inserção das Configurações Gerais
INSERT INTO public.configuracoes (id, whatsapp, instagram, maps_url, contato_email, endereco, pdf_url, horarios)
VALUES (
    'geral',
    '556181426321',
    '@backstagekaraoke',
    'https://maps.app.goo.gl/AwFhL4Z4Au6cqu4v6',
    'contato@barbackstagekaraoke.com.br',
    'CLN 307, Bloco A, Subsolo - Asa Norte, Brasília - DF',
    '/cardapio-oficial.pdf',
    '{
        "terca": "19:00 → 02:30 (madrugada de quarta)",
        "quarta": "19:00 → 03:30 (madrugada de quinta)",
        "quinta": "19:00 → 03:30 (madrugada de sexta)",
        "sexta": "18:30 → 04:00 (madrugada de sábado)",
        "sabado": "18:30 → 04:00 (madrugada de domingo)",
        "domingo": "Fechado ao público (Disponível sob consulta no WhatsApp)",
        "segunda": "Fechado ao público (Disponível sob consulta no WhatsApp)"
    }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    whatsapp = EXCLUDED.whatsapp,
    instagram = EXCLUDED.instagram,
    maps_url = EXCLUDED.maps_url,
    contato_email = EXCLUDED.contato_email,
    endereco = EXCLUDED.endereco;

-- ==============================================================================
-- 8. SUPABASE STORAGE (BUCKET PÚBLICO PARA FOTOS, VÍDEOS E DOCUMENTOS)
-- ==============================================================================
-- Cria o bucket 'backstage-media' público para guardar imagens das salas, do cardápio, vídeos e PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'backstage-media',
    'backstage-media',
    true,
    157286400, -- Limite de 150MB para vídeos de alta qualidade
    ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
        'video/mpeg',
        'application/pdf'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 157286400;

-- Políticas de acesso público para o bucket 'backstage-media'
DROP POLICY IF EXISTS "Public Read backstage-media" ON storage.objects;
CREATE POLICY "Public Read backstage-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'backstage-media');

DROP POLICY IF EXISTS "Public Upload backstage-media" ON storage.objects;
CREATE POLICY "Public Upload backstage-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'backstage-media');

DROP POLICY IF EXISTS "Public Update backstage-media" ON storage.objects;
CREATE POLICY "Public Update backstage-media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'backstage-media');

DROP POLICY IF EXISTS "Public Delete backstage-media" ON storage.objects;
CREATE POLICY "Public Delete backstage-media"
ON storage.objects FOR DELETE
USING (bucket_id = 'backstage-media');

-- ==============================================================================
-- FIM DO SCRIPT DE MIGRAÇÃO SUPABASE
-- ==============================================================================

