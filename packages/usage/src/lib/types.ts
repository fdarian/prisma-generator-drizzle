import { schema } from 'prisma/drizzle/schema'
import { db } from './postgres'

export type Db = typeof db
export type Schema = typeof schema
