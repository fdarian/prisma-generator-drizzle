---
"prisma-generator-drizzle": minor
---

`@db.*` native types are now mapped to matching Drizzle columns for Postgres and MySQL (unsupported ones keep the previous column), and implicit many-to-many join columns now take the referenced ids' type.
