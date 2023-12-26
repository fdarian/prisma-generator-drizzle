import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { schema } from 'prisma/mysql/drizzle/schema'
import { object, parse, string, url } from 'valibot'

const env = parse(
  object({
    MYSQL_DATABASE_URL: string([url()]),
  }),
  process.env
)

const connection = await mysql.createConnection(env.MYSQL_DATABASE_URL)

export const db = drizzle(connection, { schema, mode: 'default' })
