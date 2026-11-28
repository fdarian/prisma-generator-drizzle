---
"prisma-generator-drizzle": minor
---

Emit `@unique` / `@@unique` as `uniqueIndex`, `@@index` as `index` and composite `@@id` as `primaryKey`, named like Prisma (#79). Implicit many-to-many join tables get Prisma's key and index too.

Foreign keys now reference composite `@@id`, `@unique` and `@@unique` targets, not only single-column `@id`.

Index arguments Drizzle cannot express (`length`, `ops`, `clustered`, sort order on MySQL and SQLite, fulltext indexes) are skipped with a warning.
