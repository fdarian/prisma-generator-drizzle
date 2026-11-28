---
"prisma-generator-drizzle": minor
---

Emit `@unique` / `@@unique` as `uniqueIndex`, `@@index` as `index` and composite `@@id` as `primaryKey`, named like Prisma (#79). Implicit many-to-many join tables get Prisma's key and index too.

Foreign keys now reference composite `@@id` targets, not only single-column `@id`, and `@unique` / `@@unique` targets on MySQL and SQLite. On Postgres, foreign keys to a `@unique` / `@@unique` target are skipped with a warning, because `drizzle-kit` creates foreign keys before unique indexes and the migration would fail.

On Postgres, sort order is emitted as `.desc().nullsFirst()` and `ops` as `.op(...)`. A single-column `@id(map: "...")` keeps its name as a table-level `primaryKey`. Index arguments Drizzle cannot express (`clustered`, sort order and `ops` on MySQL and SQLite) are skipped with a warning, and so are whole indexes that are fulltext, have a MySQL `length`, are partial (`where:`) or are on an `@ignore` / `Unsupported` field. CockroachDB implicit join tables get a unique index instead of a primary key, like Prisma.
