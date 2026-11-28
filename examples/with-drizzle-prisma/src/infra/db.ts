import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { drizzle } from 'drizzle-orm/prisma/pg'

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set')
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const db = new PrismaClient({ adapter }).$extends(drizzle())
