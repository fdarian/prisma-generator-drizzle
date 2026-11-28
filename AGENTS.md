Prisma generator (`prisma-generator-drizzle`) that emits a Drizzle ORM schema from a Prisma schema. Published to npm; users run it on plain Node.

## Package manager and runtime

- **pnpm** is the package manager: `pnpm install`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`. Never `bun install` or `bun add`.
- **Bun** runs the `.ts` scripts (`clone:*` in `packages/usage/scripts` and the usage `start`) and the generator unit tests (`bun test`).
- Everything else executes on **Node**, even when launched with `bun` or `bunx`: the Prisma CLI, the generator binary (`dist/bin.js`, reached through pnpm's `.bin` shell wrappers, which `exec node`), Vitest, tsup and tsc.
- Launch scripts through pnpm (`pnpm run <script>`, `pnpm turbo <task>`).
- The published generator must keep working on Node: keep the `#!/usr/bin/env node` shebang, `engines.node` and the tsup build target as they are, and don't use `Bun.*` APIs in `packages/generator/src`. Usage tests run on Node too, so `Bun.*` APIs belong only in `packages/usage/scripts`.

## Workspace

- `packages/generator`: the published generator (TypeScript, tsup, `@prisma/generator-helper`). Unit tests are `*.test.ts` next to the source, run with `bun test`.
- `packages/usage`: integration tests. Generates Drizzle schemas from `prisma/schema.prisma` (cloned to MySQL and SQLite variants by `scripts/clone*.ts`) and runs them against real databases with Vitest.
- `examples/with-drizzle-prisma`: Next.js example app.

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Build the generator | `pnpm turbo build --filter=prisma-generator-drizzle` |
| Generate the usage schema | `pnpm turbo run generate --filter=usage` (needs `VITE_PG_DATABASE_URL`) |
| Typecheck + lint | `pnpm turbo check`, covering `packages/generator` only (`check:type` is `tsc --noEmit` plus a second pass over `tsconfig.test.json` with Bun types, `check:biome` is `biome ci`); `packages/usage` has no `check:*` scripts |
| Format | `pnpm exec biome check --write .` |
| Test | `pnpm turbo test` |

`pnpm turbo test` builds the generator, pushes the schema to Postgres, MySQL and SQLite, then runs both packages' tests. It needs the databases from `docker-compose.yaml` running and `VITE_PG_DATABASE_URL` / `VITE_MYSQL_DATABASE_URL` set (see `packages/usage/.env.example`). Generator unit tests alone: `pnpm --filter prisma-generator-drizzle test`.

More testing notes: [TESTING.md](./TESTING.md).
