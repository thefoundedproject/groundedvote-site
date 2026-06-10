import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

/**
 * Connection pool — Railway deployment guidance:
 *
 * Railway PostgreSQL defaults to 100 max_connections. Under load, Next.js can
 * run multiple instances each opening their own pool. Append these params to
 * DATABASE_URL to cap each instance at 10 connections and avoid exhaustion:
 *
 *   ?connection_limit=10&pool_timeout=20
 *
 * If Railway's Pgbouncer proxy is enabled, also add &pgbouncer=true so Prisma
 * uses prepared-statement compatibility mode.
 *
 * Full example:
 *   postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
