---
"prisma-generator-drizzle": minor
---

Emit `@unique` / `@@unique` as `uniqueIndex`, `@@index` as `index` and composite `@@id` as `primaryKey`, named like Prisma (#79). Implicit many-to-many join tables get Prisma's key and index too.

Foreign keys now reference composite `@@id`, `@unique` and `@@unique` targets, not only single-column `@id`.

On Postgres, sort order is emitted as `.desc().nullsFirst()` and `ops` as `.op(...)`. Index arguments Drizzle cannot express (`length`, `clustered`, sort order and `ops` on MySQL and SQLite) are skipped with a warning, and so are whole indexes that are fulltext, partial (`where:`) or on an `@ignore` / `Unsupported` field.
