## Testing Notes

> Quick notes on the findings when building the test, not a comprehensive guide yet.

### On using Vitest

- Vitest is used for testing mainly because of its [typechecking capabilities](https://vitest.dev/guide/testing-types).

- The Prisma schema in `packages/usage` references the generator as `prisma-generator-drizzle`, which resolves through `node_modules/.bin` on `PATH`. Run it through pnpm (`pnpm test`, `pnpm exec prisma generate`) so that the workspace bin is found.

- The generator must be built before `prisma generate` runs, since the schema executes its `dist/bin.js`. `pnpm turbo test` from the repo root handles this. Otherwise, run `pnpm turbo build --filter=prisma-generator-drizzle` before `pnpm test` in `packages/usage`.

- The multi-schema fixture in `packages/usage` pushes to a separate `<db>_multi_schema` database on the same server, so the role in `VITE_PG_DATABASE_URL` needs `CREATEDB` locally.
