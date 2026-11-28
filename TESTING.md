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

### Testing the generator

- Generator snapshots live in `packages/generator/src/__tests__/__snapshots__/<provider>/<fixture>/`, one file per emitted module. They are the generator's raw output, unformatted.

- To add a fixture, write a Prisma schema in the matching `packages/generator/src/__tests__/snapshots/*.test.ts` and call `expectSchemaToMatchSnapshots(schema, { provider, fixture })` from `src/__tests__/harness.ts`. Each fixture directory belongs to exactly one test, and a fixture that generates no files fails.

- A run without `UPDATE_SNAPSHOTS` compares the emitted file set and contents with the fixture directory, and a mismatch or a missing directory fails with the command to run. To record or update snapshots, run `UPDATE_SNAPSHOTS=1 bun test` in `packages/generator`; it rewrites each fixture directory, removing files the generator no longer emits. Review the diff before committing.

- `pnpm test` in `packages/generator` also typechecks the snapshots against drizzle-orm (`tsrs -p tsconfig.snapshots.json`), so a snapshot that emits invalid code fails the Test job. Files in `__snapshots__` that are not inside a fixture directory (`directive-stubs.ts`) are hand-written.

- Snapshots are excluded from biome, from the lefthook pre-commit, and from the generator's tsconfigs, since they are generated output.

- The formatter tests call `prettier` and `biome` by bare name, so they prepend the repo's `node_modules/.bin` directories to `PATH` themselves.

- A test that exposes a known generator bug is written with the correct expectation and marked `test.failing`, with a one-line comment giving the reason and the generator `file:line`. The bug is not fixed in the same change; when it is fixed, `test.failing` starts failing and gets switched to `test`.
