import { mysqlAdapter } from './providers/mysql'
import { postgresAdapter } from './providers/postgres'
import { sqliteAdapter } from './providers/sqlite'

export type Adapter =
	| typeof postgresAdapter
	| typeof mysqlAdapter
	| typeof sqliteAdapter
