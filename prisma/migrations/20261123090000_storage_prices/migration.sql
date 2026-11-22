-- Per-storage prices; discounts (special price) removed
ALTER TABLE "Product" ADD COLUMN "storagePrices" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Product" DROP COLUMN "specialPrice";
