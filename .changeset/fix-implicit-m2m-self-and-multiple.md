---
"prisma-generator-drizzle": patch
---

Implicit many-to-many relations now work for self relations and for multiple relations between the same two models.

A self one-to-many relation whose list field is declared before the foreign key field is no longer mistaken for an implicit many-to-many relation, which produced a bogus join table.

Implicit many-to-many relations whose names collide after normalization (e.g. `post_likes` and `PostLikes`) are rejected with an error instead of silently dropping a join table.
