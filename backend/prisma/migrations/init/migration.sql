-- Migration: init
-- CRM Gelateria Moderna - Alinhado com schema.prisma em 16/05/2026
-- Todas as tabelas, índices e constraints

-- CreateTable CLIENTES
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome_fantasia" VARCHAR(255) NOT NULL,
    "cnpj" VARCHAR(20),
    "segmento" VARCHAR(50),
    "endereco" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "telefone" VARCHAR(20),
    "email" VARCHAR(255),
    "whatsapp" VARCHAR(20),
    "total_vendas_historico" DECIMAL(10,2),
    "media_mensal_historica" DECIMAL(10,2),
    "media_mensal_customizada" DECIMAL(10,2),
    "ultima_visita" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ativo',
    "omie_codigo" VARCHAR(50),
    "origem" VARCHAR(50),
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable VENDEDORES
CREATE TABLE "Vendedor" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "whatsapp" VARCHAR(20),
    "regiao" VARCHAR(100),
    "meta_visitas_dia" INTEGER NOT NULL DEFAULT 10,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ativo',
    "data_admissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable ROTAS
CREATE TABLE "Rota" (
    "id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "data_rota" DATE NOT NULL,
    "clientes_sequencia" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'planejada',
    "distancia_total_km" DECIMAL(8,2),
    "tempo_estimado_minutos" INTEGER,
    "hora_planejamento" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rota_pkey" PRIMARY KEY ("id")
);

-- CreateTable ATIVIDADES
CREATE TABLE "Atividade" (
    "id" TEXT NOT NULL,
    "rota_id" TEXT,
    "cliente_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "data_hora_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_hora_fim" TIMESTAMP(3),
    "duracao_minutos" INTEGER,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "latitude_fim" DECIMAL(10,8),
    "longitude_fim" DECIMAL(11,8),
    "resultado" VARCHAR(50),
    "valor_pedido" DECIMAL(10,2),
    "observacoes" TEXT,
    "fotos" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable PROPOSTAS
CREATE TABLE "Proposta" (
    "id" TEXT NOT NULL,
    "codigo" VARCHAR(50),
    "cliente_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "itens" JSONB,
    "valor_total" DECIMAL(10,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'enviada',
    "validade" TIMESTAMP(3),
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_aceite" TIMESTAMP(3),
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable VENDAS
CREATE TABLE "Venda" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "proposta_id" TEXT,
    "omie_pedido_id" VARCHAR(50),
    "data_venda" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'vendas',
    "data_recebimento" TIMESTAMP(3),
    "valor_recebido" DECIMAL(10,2),
    "data_atualizacao" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable LEADS
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(20),
    "email" VARCHAR(255),
    "empresa" VARCHAR(255),
    "segmento" VARCHAR(50),
    "origem" VARCHAR(50),
    "vendedor_id" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'novo',
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_ultimo_contato" TIMESTAMP(3),
    "data_conversao" TIMESTAMP(3),
    "cliente_id_convertido" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable COMISSOES
CREATE TABLE "Comissao" (
    "id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "venda_id" TEXT,
    "cliente_id" TEXT,
    "tipo_comissao" VARCHAR(50) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "percentual" DECIMAL(5,2),
    "valor_base" DECIMAL(10,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "data_calculo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_pagamento" TIMESTAMP(3),
    "descricao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable FREEZERS
CREATE TABLE "Freezer" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "tipo" VARCHAR(50),
    "capacidade_kg" DECIMAL(8,2),
    "data_ultima_manutencao" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'funcionando',
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Freezer_pkey" PRIMARY KEY ("id")
);

-- CreateTable PARAMETROS
CREATE TABLE "Parametro" (
    "id" TEXT NOT NULL,
    "chave" VARCHAR(100) NOT NULL,
    "valor" TEXT,
    "descricao" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parametro_pkey" PRIMARY KEY ("id")
);

-- CreateTable USUARIOS
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'vendedor',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (Unique)
CREATE UNIQUE INDEX "Cliente_cnpj_key" ON "Cliente"("cnpj");
CREATE UNIQUE INDEX "Vendedor_email_key" ON "Vendedor"("email");
CREATE UNIQUE INDEX "Proposta_codigo_key" ON "Proposta"("codigo");
CREATE UNIQUE INDEX "Parametro_chave_key" ON "Parametro"("chave");
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex (Performance)
CREATE INDEX "Cliente_segmento_idx" ON "Cliente"("segmento");
CREATE INDEX "Cliente_status_idx" ON "Cliente"("status");
CREATE INDEX "Cliente_ultima_visita_idx" ON "Cliente"("ultima_visita");

CREATE INDEX "Vendedor_status_idx" ON "Vendedor"("status");

CREATE INDEX "Rota_vendedor_id_idx" ON "Rota"("vendedor_id");
CREATE INDEX "Rota_data_rota_idx" ON "Rota"("data_rota");
CREATE INDEX "Rota_status_idx" ON "Rota"("status");

CREATE INDEX "Atividade_rota_id_idx" ON "Atividade"("rota_id");
CREATE INDEX "Atividade_cliente_id_idx" ON "Atividade"("cliente_id");
CREATE INDEX "Atividade_vendedor_id_idx" ON "Atividade"("vendedor_id");
CREATE INDEX "Atividade_data_hora_inicio_idx" ON "Atividade"("data_hora_inicio");

CREATE INDEX "Proposta_cliente_id_idx" ON "Proposta"("cliente_id");
CREATE INDEX "Proposta_vendedor_id_idx" ON "Proposta"("vendedor_id");
CREATE INDEX "Proposta_status_idx" ON "Proposta"("status");
CREATE INDEX "Proposta_data_criacao_idx" ON "Proposta"("data_criacao");

CREATE INDEX "Venda_cliente_id_idx" ON "Venda"("cliente_id");
CREATE INDEX "Venda_vendedor_id_idx" ON "Venda"("vendedor_id");
CREATE INDEX "Venda_status_idx" ON "Venda"("status");
CREATE INDEX "Venda_data_recebimento_idx" ON "Venda"("data_recebimento");

CREATE INDEX "Lead_vendedor_id_idx" ON "Lead"("vendedor_id");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_data_criacao_idx" ON "Lead"("data_criacao");

CREATE INDEX "Comissao_vendedor_id_idx" ON "Comissao"("vendedor_id");
CREATE INDEX "Comissao_tipo_comissao_idx" ON "Comissao"("tipo_comissao");
CREATE INDEX "Comissao_status_idx" ON "Comissao"("status");
CREATE INDEX "Comissao_data_calculo_idx" ON "Comissao"("data_calculo");

CREATE INDEX "Freezer_cliente_id_idx" ON "Freezer"("cliente_id");

CREATE INDEX "Parametro_chave_idx" ON "Parametro"("chave");

CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");
CREATE INDEX "Usuario_role_idx" ON "Usuario"("role");

-- AddForeignKey
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "Vendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Atividade" ADD CONSTRAINT "Atividade_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "Rota"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Atividade" ADD CONSTRAINT "Atividade_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Atividade" ADD CONSTRAINT "Atividade_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "Vendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "Vendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Venda" ADD CONSTRAINT "Venda_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "Vendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_proposta_id_fkey" FOREIGN KEY ("proposta_id") REFERENCES "Proposta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "Vendedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_cliente_id_convertido_fkey" FOREIGN KEY ("cliente_id_convertido") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "Vendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Freezer" ADD CONSTRAINT "Freezer_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
