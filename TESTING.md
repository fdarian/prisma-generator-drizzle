## Testing Notes

> Quick notes on the findings when building the test, not a comprehensive guide yet.

### Tooling

- pnpm installs dependencies and launches scripts (`pnpm run <script>`, `pnpm turbo ...`). Bun runs only the `.ts` scripts (`clone:*`, usage `start`) and the generator unit tests. The Prisma CLI, the generator binary, Vitest and tsdown execute on Node, even when launched through `bun` or `bunx`.

- Generator unit tests (`packages/generator`) run with `bun test`.

- Usage tests (`packages/usage`) run with Vitest, mainly because of its [typechecking capabilities](https://vitest.dev/guide/testing-types).

- The Prisma schema in `packages/usage` references the generator as `bunx prisma-generator-drizzle`, and the tests call `bun prisma generate`. Bun resolves the workspace bin from `node_modules/.bin`, so it does not download the published package.

- The generator must be built before `prisma generate` runs, since the schema executes its `dist/bin.js`. `pnpm turbo test` from the repo root handles this. Otherwise, run `pnpm turbo build --filter=prisma-generator-drizzle` before `pnpm test` in `packages/usage`.

- The multi-schema fixture in `packages/usage` pushes to a separate `<db>_multi_schema` database on the same server, so the role in `VITE_PG_DATABASE_URL` needs `CREATEDB` locally.

- `packages/usage/prisma/schema.prisma` is the Postgres schema and the source for the MySQL and SQLite ones (`pnpm clone:mysql`, `pnpm clone:sqlite`). A line suffixed `// -mysql` or `// -sqlite` is dropped from that provider's schema, `// start -<provider>` / `// end -<provider>` drops a whole region, and a line prefixed `// +mysql ` is uncommented only in the MySQL schema (for MySQL-only native types).
