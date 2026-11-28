import type { PostgresDb, PostgresSchema } from 'src/lib/types'

/** The shared runtime tests are written against the postgres types; drizzle's per-dialect query builders don't form a callable union */
export type TestContext = {
	db: PostgresDb
	schema: PostgresSchema
	provider: 'postgres' | 'sqlite' | 'mysql'
}
