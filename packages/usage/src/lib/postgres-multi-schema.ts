import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from 'prisma/multi-schema/drizzle/schema'
import { url, object, parse, pipe, string } from 'valibot'
import { getMultiSchemaDatabaseUrl } from './multi-schema-url'

const env = parse(
	object({
		VITE_PG_DATABASE_URL: pipe(string(), url()),
	}),
	process.env
)

const queryClient = postgres(
	getMultiSchemaDatabaseUrl(env.VITE_PG_DATABASE_URL)
)
export const db = drizzle(queryClient, { schema })
