## Testing Notes

> Quick notes on the findings when building the test, not a comprehensive guide yet.

### On using Vitest

- Vitest is used for testing mainly because of its [typechecking capabilities](https://vitest.dev/guide/testing-types).

- The Prisma schema in `packages/usage` references the generator as `prisma-generator-drizzle`, which resolves through `node_modules/.bin` on `PATH`. Run it through pnpm (`pnpm test`, `pnpm exec prisma generate`) so that the workspace bin is found.
