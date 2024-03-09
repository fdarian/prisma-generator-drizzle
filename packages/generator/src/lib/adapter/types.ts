import type { mysqlAdapter } from './providers/mysql'
import type { postgresAdapter } from './providers/postgres'
import type { sqliteAdapter } from './providers/sqlite'

export type Adapter =
	| typeof postgresAdapter
	| typeof mysqlAdapter
	| typeof sqliteAdapter
