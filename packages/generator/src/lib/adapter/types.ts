import { mysqlAdapter } from './providers/mysql'
import { postgresAdapter } from './providers/postgres'

export type Adapter = typeof postgresAdapter | typeof mysqlAdapter
