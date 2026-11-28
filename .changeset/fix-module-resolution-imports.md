---
"prisma-generator-drizzle": patch
---

The auto-detected `moduleResolution` is now applied (inferred from `module` when unset), so `node16`/`nodenext` projects get `.js` import extensions, and imports that already have an extension are left alone.
