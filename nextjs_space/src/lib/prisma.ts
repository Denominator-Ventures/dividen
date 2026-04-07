import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: appendConnectionParams(process.env.DATABASE_URL || ''),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Appends connection pool limits to DATABASE_URL if not already present.
 * Keeps Prisma pool to 10 connections (of 25 max) to leave headroom.
 */
function appendConnectionParams(url: string): string {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  const params: string[] = [];
  if (!url.includes('connection_limit=')) params.push('connection_limit=10');
  if (!url.includes('pool_timeout=')) params.push('pool_timeout=15');
  return params.length > 0 ? `${url}${sep}${params.join('&')}` : url;
}