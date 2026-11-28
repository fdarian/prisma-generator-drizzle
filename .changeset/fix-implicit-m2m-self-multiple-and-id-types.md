---
"prisma-generator-drizzle": patch
---

Implicit many-to-many relations now work for self relations, for multiple relations between the same two models, and for non-String ids (join table columns copy the referenced id's type).
