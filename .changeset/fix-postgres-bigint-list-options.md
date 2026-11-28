---
"prisma-generator-drizzle": patch
---

Postgres `BigInt[]` fields now generate a valid `bigint(...).array()` column instead of invalid code.
