# Contributing

Run the tests as described in [TESTING.md](TESTING.md).

## Releasing

Releases use [Changesets](https://github.com/changesets/changesets).

1. If your PR changes `prisma-generator-drizzle`, run `pnpm changeset`, pick the bump (patch, minor or major), write a one-line summary and commit the generated file in `.changeset/`.
2. When a PR with changesets merges to `main`, the Release workflow opens or updates a "Version Packages" PR that bumps the version and writes the changelog.
3. Merging that PR publishes `prisma-generator-drizzle` to npm and creates the GitHub Release. Publishing uses npm trusted publishing (OIDC), so there is no npm token, and the package gets provenance.

`usage` and `with-drizzle-prisma` are private and never published.
