# prisma-generator-drizzle

## 0.8.0

### Minor Changes

- 3f24524: Emit `@unique` / `@@unique` as `uniqueIndex`, `@@index` as `index` and composite `@@id` as `primaryKey`, named like Prisma (#79). Implicit many-to-many join tables get Prisma's key and index too.
  
  Foreign keys now reference composite `@@id` targets, not only single-column `@id`, and `@unique` / `@@unique` targets on MySQL and SQLite. On Postgres, foreign keys to a `@unique` / `@@unique` target are skipped with a warning, because `drizzle-kit` creates foreign keys before unique indexes and the migration would fail.
  
  On Postgres, sort order is emitted as `.desc().nullsFirst()` and `ops` as `.op(...)`. A single-column `@id(map: "...")` keeps its name as a table-level `primaryKey`. Index arguments Drizzle cannot express (`clustered`, sort order and `ops` on MySQL and SQLite) are skipped with a warning, and so are whole indexes that are fulltext, have a MySQL `length`, are partial (`where:`) or are on an `@ignore` / `Unsupported` field. CockroachDB implicit join tables get a unique index instead of a primary key, like Prisma.
- bb1cec9: Add an experimental `relations = "v2"` generator option that outputs a single `defineRelations` call (`relations` export) for drizzle-orm 1.0. The default `relations = "v1"` output is unchanged.
- 781c1fd: `@db.*` native types are now mapped to matching Drizzle columns for Postgres and MySQL (unsupported ones keep the previous column), and implicit many-to-many join columns now take the referenced ids' type.
- 9b2aea5: Support Prisma multi-schema (`@@schema`) on PostgreSQL via `pgSchema`.
- ca015a8: Support Prisma 7 and drizzle-orm 0.45 (the generator is now built on `@prisma/generator-helper` 7).
- 11c50d5: Typed JSON columns via `drizzle.type` (imports are now derived by parsing the type expression) and `drizzle.custom` (inline `$type`); unsupported type expressions and trailing commas in `drizzle.custom` now throw an error naming the field.
- 11c50d5: `@updatedAt` fields now get `.$onUpdate(...)` (honouring `drizzle.dateMode`).

### Patch Changes

- ca015a8: `drizzle.custom` and other `///` directives are found when mixed with ordinary doc-comment lines, and prose lines that merely start with `drizzle.custom` are ignored.
- ca015a8: Implicit many-to-many join tables on models with `@@map` now use the model names.
- 8cf6d47: Implicit many-to-many relations now work for self relations and for multiple relations between the same two models.
  
  A self one-to-many relation whose list field is declared before the foreign key field is no longer mistaken for an implicit many-to-many relation, which produced a bogus join table.
  
  Implicit many-to-many relations whose names collide after normalization (e.g. `post_likes` and `PostLikes`) are rejected with an error instead of silently dropping a join table.
- 11c50d5: Enum column defaults now use the `@map`ped database value instead of the Prisma member name.
- 13cef84: The auto-detected `moduleResolution` is now applied (inferred from `module` when unset), so `node16`/`nodenext` projects get `.js` import extensions, and imports that already have an extension are left alone.
- 781c1fd: Postgres `BigInt[]` fields now generate a valid `bigint(...).array()` column instead of invalid code.
- 13cef84: Single-file output now exports `schema`.
- a20e5d1: The package's `license` field now says Apache-2.0, matching the bundled `LICENSE` file.
