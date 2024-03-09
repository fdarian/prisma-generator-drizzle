import type { Db, Schema } from 'src/lib/types'

export type TestContext = {
	db: Db
	schema: Schema
	provider: 'postgres' | 'sqlite' | 'mysql'
}
