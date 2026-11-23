-- Used-phone listings: condition details, currency, per-unit installment offers; live vs studio photos
ALTER TABLE "Product" ADD COLUMN "condition" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE "Product" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'UZS';
ALTER TABLE "Product" ADD COLUMN "batteryHealth" INTEGER;
ALTER TABLE "Product" ADD COLUMN "batteryCycles" INTEGER;
ALTER TABLE "Product" ADD COLUMN "hasBox" BOOLEAN;
ALTER TABLE "Product" ADD COLUMN "region" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN "conditionNoteRu" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN "conditionNoteUz" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN "installmentOffers" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ProductImage" ADD COLUMN "style" TEXT NOT NULL DEFAULT 'studio';
