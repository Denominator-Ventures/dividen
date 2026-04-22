# DiviDen Integration Test Suite

**Status**: Phase 1 of Cleanup Roadmap (see `/CLEANUP_ROADMAP.md`)
**Framework**: Vitest
**Scope**: Critical-path tests only. Not a comprehensive suite.

## Running

```bash
cd nextjs_space
yarn test              # single run
yarn test:watch        # watch mode
yarn test:coverage     # with coverage report
```

## Philosophy

These tests exist so the Phase 2 refactors (splitting `action-tags.ts` and
`system-prompt.ts`) are safe. They are integration tests — they hit the real
shared dev/prod DB — because:

1. The code is deeply Prisma-coupled; mocking Prisma would be lies.
2. We have a known seeded state (Jon, Jaron, Alvaro) that we can rely on.
3. Fast enough (< 30s) because we're testing a small critical surface.

## Rules for test authors

- **Never delete user data.** Create rows under `TEST_MARKER` prefix if needed.
- **Clean up after yourself.** `afterAll` should delete anything the test created.
- **Use the seeded users** (`TEST_USER_ID`, `TEST_PEER_USER_ID`, `TEST_FED_USER_ID`).
- **Don't assert on counts that other test runs affect.** Use IDs and filters.
- **If a test is flaky, delete it.** Flaky tests are worse than no tests.

## Files covered

- `src/lib/prompt-guard.ts` — pure function tests (input sanitization)
- `src/lib/action-tags.ts` — parse + strip + sanitize utilities
- `src/lib/federation-push.ts` — HMAC header construction (no actual network calls)
- `src/app/api/chat/send/route.ts` — end-to-end chat flow (mocked LLM)
- `src/app/api/cron/sweep/route.ts` — sweep logic, no mutations verified
