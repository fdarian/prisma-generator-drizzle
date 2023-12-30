import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { schema } from 'prisma/sqlite/drizzle/schema'

const sqlite = new Database('./prisma/sqlite/test.db')
export const db = drizzle(sqlite, { schema })
