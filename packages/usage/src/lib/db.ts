import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from 'prisma/drizzle/schema'
import { object, parse, string, url } from 'valibot'

const env = parse(
  object({
    DATABASE_URL: string([url()]),
  }),
  process.env
)

const queryClient = postgres(env.DATABASE_URL)
export const db = drizzle(queryClient, { schema })
