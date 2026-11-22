/**
 * Create an admin or reset an existing admin's password (also switches off 2FA for that admin):
 *   ADMIN_USERNAME=owner ADMIN_PASSWORD='S3cure-pass-2026' npm run admin:create
 */
import { createPrisma } from "../src/lib/prisma-factory";
import bcrypt from "bcryptjs";

const prisma = createPrisma();

async function main() {
  const username = (process.env.ADMIN_USERNAME ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!/^[a-z0-9._-]{3,60}$/.test(username)) throw new Error("ADMIN_USERNAME: 3–60 latin letters, digits, . _ -");
  if (password.length < 10 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) throw new Error("ADMIN_PASSWORD: min 10 chars, letters and digits");
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.adminUser.upsert({
    where: { username },
    create: { username, passwordHash },
    // a password reset is also the recovery path for a lost authenticator: 2FA is switched off
    update: { passwordHash, tokenVersion: { increment: 1 }, totpSecret: null, totpEnabledAt: null, totpLastStep: null },
  });
  console.log(`✓ admin "${user.username}" is ready (all previous sessions of this user were signed out)`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
