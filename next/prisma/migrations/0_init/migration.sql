-- CreateTable
CREATE TABLE "api_coverage" (
    "id" SERIAL NOT NULL,
    "country_name" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "issuer" VARCHAR(200),
    "currency" VARCHAR(20),
    "ticker" VARCHAR(40),
    "security_type" VARCHAR(30) NOT NULL,
    "asset_class" VARCHAR(20),
    "exchange" VARCHAR(20),

    CONSTRAINT "api_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_factorreturns" (
    "factor" VARCHAR(10) NOT NULL,
    "ret" DOUBLE PRECISION NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "period" VARCHAR(50) NOT NULL,
    "period_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "api_factorreturns_pkey" PRIMARY KEY ("period_name")
);

-- CreateTable
CREATE TABLE "api_secfilingpaths" (
    "id" SERIAL NOT NULL,
    "issuer_id" INTEGER NOT NULL,
    "form_id" INTEGER NOT NULL,
    "date" INTEGER NOT NULL,
    "path" VARCHAR(100) NOT NULL,

    CONSTRAINT "api_secfilingpaths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_secformid" (
    "form_id" SERIAL NOT NULL,
    "form_name" VARCHAR(20) NOT NULL,

    CONSTRAINT "api_secformid_pkey" PRIMARY KEY ("form_id")
);

-- CreateTable
CREATE TABLE "api_secissuerid" (
    "issuer_id" INTEGER NOT NULL,
    "issuer_name" VARCHAR(200) NOT NULL,

    CONSTRAINT "api_secissuerid_pkey" PRIMARY KEY ("issuer_id")
);

-- CreateTable
CREATE TABLE "api_secthirteenffiling" (
    "id" SERIAL NOT NULL,
    "issuer_id" INTEGER NOT NULL,
    "filing_date" INTEGER NOT NULL,
    "period_date" INTEGER NOT NULL,

    CONSTRAINT "api_secthirteenffiling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_secthirteenfposition" (
    "id" SERIAL NOT NULL,
    "thirteenf_id" INTEGER NOT NULL,
    "shares" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "cusip" VARCHAR(10) NOT NULL,

    CONSTRAINT "api_secthirteenfposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_sess" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "api_user" (
    "id" SERIAL NOT NULL,
    "user_key" VARCHAR(50) NOT NULL,

    CONSTRAINT "api_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_userfinancialplan" (
    "id" SERIAL NOT NULL,
    "user_key" CHAR(50),
    "plan" JSONB,
    "name" VARCHAR(20),

    CONSTRAINT "api_userfinancialplan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_userissuer" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "issuer_id" INTEGER NOT NULL,

    CONSTRAINT "api_userissuer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_userportfolio" (
    "id" SERIAL NOT NULL,
    "user_key" CHAR(50),
    "portfolio" JSONB,
    "name" VARCHAR(20),

    CONSTRAINT "api_userportfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "django_content_type" (
    "id" SERIAL NOT NULL,
    "app_label" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,

    CONSTRAINT "django_content_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "django_migrations" (
    "id" SERIAL NOT NULL,
    "app" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "applied" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "django_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "django_session" (
    "session_key" VARCHAR(40) NOT NULL,
    "session_data" TEXT NOT NULL,
    "expire_date" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "django_session_pkey" PRIMARY KEY ("session_key")
);

-- CreateTable
CREATE TABLE "ff_factors" (
    "factor" VARCHAR(10),
    "period" INTEGER,
    "ret" DOUBLE PRECISION,
    "name" VARCHAR(100),
    "period_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "ff_factors_pkey" PRIMARY KEY ("period_name")
);

-- CreateTable
CREATE TABLE "jst_world_bond" (
    "year" INTEGER NOT NULL,
    "real" DOUBLE PRECISION,
    "nom" DOUBLE PRECISION,

    CONSTRAINT "jst_world_bond_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "jst_world_equity" (
    "year" INTEGER NOT NULL,
    "real" DOUBLE PRECISION,
    "nom" DOUBLE PRECISION,

    CONSTRAINT "jst_world_equity_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_coverage_country_name_name_currency_issuer_8b1be644_uniq" ON "api_coverage"("country_name", "name", "currency", "issuer");

-- CreateIndex
CREATE INDEX "api_factorreturns_period_name_c67e4387_like" ON "api_factorreturns"("period_name");

-- CreateIndex
CREATE UNIQUE INDEX "api_secfilingpaths_issuer_id_form_id_date_4863085a_uniq" ON "api_secfilingpaths"("issuer_id", "form_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "api_secformid_form_name_484150e1_uniq" ON "api_secformid"("form_name");

-- CreateIndex
CREATE UNIQUE INDEX "api_secthirteenffiling_issuer_id_filing_date_77ea19cc_uniq" ON "api_secthirteenffiling"("issuer_id", "filing_date");

-- CreateIndex
CREATE UNIQUE INDEX "api_secthirteenfposition_thirteenf_id_cusip_227f54a4_uniq" ON "api_secthirteenfposition"("thirteenf_id", "cusip");

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "api_sess"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "api_user_userkey" ON "api_user"("user_key");

-- CreateIndex
CREATE UNIQUE INDEX "api_userissuer_user_id_issuer_id_b988f29a_uniq" ON "api_userissuer"("user_id", "issuer_id");

-- CreateIndex
CREATE UNIQUE INDEX "django_content_type_app_label_model_76bd3d3b_uniq" ON "django_content_type"("app_label", "model");

-- CreateIndex
CREATE INDEX "django_session_expire_date_a5c62663" ON "django_session"("expire_date");

-- CreateIndex
CREATE INDEX "django_session_session_key_c0390e0f_like" ON "django_session"("session_key");

-- AddForeignKey
ALTER TABLE "api_userfinancialplan" ADD CONSTRAINT "fk_user_key" FOREIGN KEY ("user_key") REFERENCES "api_user"("user_key") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_userportfolio" ADD CONSTRAINT "fk_user_key" FOREIGN KEY ("user_key") REFERENCES "api_user"("user_key") ON DELETE NO ACTION ON UPDATE NO ACTION;

