import type { schema } from 'prisma/drizzle/schema'
import type { db } from './postgres'

export type Db = typeof db
export type Schema = typeof schema
