import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import { schema } from 'prisma/drizzle/schema'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

await client.connect()
const db = drizzle(client, { schema })

process.exit(0)
