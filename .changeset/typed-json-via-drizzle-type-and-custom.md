---
"prisma-generator-drizzle": minor
---

Typed JSON columns via `drizzle.type` (imports are now derived by parsing the type expression) and `drizzle.custom` (inline `$type`); unsupported type expressions and trailing commas in `drizzle.custom` now throw an error naming the field.
