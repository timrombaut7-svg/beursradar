import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Prisma-client (singleton) voor PostgreSQL. De database is optioneel: zonder
 * DATABASE_URL draaien watchlist en portfolio alleen in LocalStorage.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaUrl?: string };

export function dbEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseDisabledError();
  // Opnieuw aanmaken als de URL wijzigt (o.a. in tests met een tijdelijke database)
  if (!globalForPrisma.prisma || globalForPrisma.prismaUrl !== url) {
    globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    globalForPrisma.prismaUrl = url;
  }
  return globalForPrisma.prisma;
}

export class DatabaseDisabledError extends Error {
  constructor() {
    super("Database niet geconfigureerd (DATABASE_URL ontbreekt)");
  }
}
