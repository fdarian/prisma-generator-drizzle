import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { schema } from 'prisma/mysql/drizzle/schema'
import { url, object, parse, pipe, string } from 'valibot'

const env = parse(
	object({
		VITE_MYSQL_DATABASE_URL: pipe(string(), url()),
	}),
	process.env
)

const connection = await mysql.createConnection(env.VITE_MYSQL_DATABASE_URL)

export const db = drizzle(connection, { schema, mode: 'default' })
