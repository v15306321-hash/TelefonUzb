-- Two-factor authentication (TOTP) for admin users
ALTER TABLE "AdminUser" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN "totpEnabledAt" TIMESTAMP(3);
ALTER TABLE "AdminUser" ADD COLUMN "totpLastStep" INTEGER;
