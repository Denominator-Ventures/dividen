/**
 * Vitest global setup.
 * Loaded before any test file. Runs in Node environment.
 *
 * Responsibilities:
 *  - Ensure test env vars are set
 *  - Provide a PrismaClient bound to the same shared dev/prod DB
 *    (reads from .env.test if present, else .env)
 *  - Expose a `TEST_USER_ID` constant for tests that need a known user
 *
 * Note: we do NOT wipe data. The DB is shared between dev and prod.
 * Tests that create rows MUST clean up after themselves (use unique IDs
 * or delete in afterAll/afterEach).
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { afterAll } from 'vitest';

// Load .env.test first (if exists), then .env as fallback
loadEnv({ path: path.resolve(__dirname, '../../.env.test') });
loadEnv({ path: path.resolve(__dirname, '../../.env') });

// Known seeded user IDs (from scripts/seed.ts)
export const TEST_USER_ID = 'cmo1kgydf00o4sz086ffjsmp1'; // Jon
export const TEST_USER_EMAIL = 'jon@colab.la';
export const TEST_PEER_USER_ID = 'cmo1milx900g9o408deuk7h2f'; // Jaron
export const TEST_FED_USER_ID = 'cmo1n6psb023co408ikcsw7xb'; // Alvaro / FVP

// Shared Prisma client for tests (same DB as dev)
export const testPrisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Marker prefix for any test-created rows so we can clean up if needed
export const TEST_MARKER = 'vitest-';

afterAll(async () => {
  await testPrisma.$disconnect();
});
