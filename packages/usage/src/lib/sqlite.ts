import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { schema } from 'prisma/sqlite/drizzle/schema'

const sqlite = new Database('./prisma/sqlite/test.db')
export const db = drizzle(sqlite, { schema })
