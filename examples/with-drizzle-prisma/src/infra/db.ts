import { PrismaClient } from '@prisma/client'
import { drizzle } from 'drizzle-orm/prisma/pg'

export const db = new PrismaClient().$extends(drizzle())
