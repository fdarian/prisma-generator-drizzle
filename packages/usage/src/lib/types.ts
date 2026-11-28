import type { schema as postgresSchema } from 'prisma/drizzle/schema'
import type { schema as mysqlSchema } from 'prisma/mysql/drizzle/schema'
import type { schema as sqliteSchema } from 'prisma/sqlite/drizzle/schema'
import type { db as mysqlDb } from './mysql'
import type { db as postgresDb } from './postgres'
import type { db as sqliteDb } from './sqlite'

export type PostgresDb = typeof postgresDb
export type PostgresSchema = typeof postgresSchema
export type MysqlDb = typeof mysqlDb
export type MysqlSchema = typeof mysqlSchema
export type SqliteDb = typeof sqliteDb
export type SqliteSchema = typeof sqliteSchema
