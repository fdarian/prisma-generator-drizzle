## Testing Notes

> Quick notes on the findings when building the test, not a comprehensive guide yet.

### On using Vitest

- Although this project uses bun for the package manager, Vitest is used for testing solely because of its [typechecking capabilities](https://vitest.dev/guide/testing-types).

- When running Vitest using Bun (`bun vitest run`), there are still `node` calls occurring in the background. Therefore, ensure that you specify `bunx prisma-generator-drizzle` when building the Prisma schema.

- We're considering a full migration to `pnpm` + `vitest` in the future for the sake of consistency.