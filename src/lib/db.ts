import type { PrismaClient } from "@prisma/client";
import { createPrisma } from "./prisma-factory";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma(process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
