import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { drizzle } from 'drizzle-orm/prisma/pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const db = new PrismaClient({ adapter }).$extends(drizzle())
