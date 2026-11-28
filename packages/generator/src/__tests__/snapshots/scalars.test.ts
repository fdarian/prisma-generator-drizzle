import { describe, expect, test } from 'bun:test'
import { expectFilesToMatchSnapshots, generateFromSchema } from '../harness'

const postgres = `
datasource db {
  provider = "postgresql"
}

model Scalars {
  id         Int       @id
  string     String
  int        Int
  bigInt     BigInt
  float      Float
  decimal    Decimal
  boolean    Boolean
  dateTime   DateTime
  json       Json
  bytes      Bytes
  stringOpt  String?
  intOpt     Int?
  bigIntOpt  BigInt?
  floatOpt   Float?
  decimalOpt Decimal?
  booleanOpt Boolean?
  dateTimeOpt DateTime?
  jsonOpt    Json?
  bytesOpt   Bytes?
}
`

const mysql = postgres.replace('"postgresql"', '"mysql"')

const sqlite = `
datasource db {
  provider = "sqlite"
}

model Scalars {
  id         Int       @id
  string     String
  int        Int
  bigInt     BigInt
  float      Float
  decimal    Decimal
  boolean    Boolean
  dateTime   DateTime
  bytes      Bytes
  stringOpt  String?
  intOpt     Int?
  bigIntOpt  BigInt?
  floatOpt   Float?
  decimalOpt Decimal?
  booleanOpt Boolean?
  dateTimeOpt DateTime?
  bytesOpt   Bytes?
}
`

describe('scalars', () => {
	test.each([
		{ provider: 'postgres', schema: postgres },
		{ provider: 'mysql', schema: mysql },
		{ provider: 'sqlite', schema: sqlite },
	])('$provider', async (testCase) => {
		const files = await generateFromSchema(testCase.schema)
		expectFilesToMatchSnapshots(files, {
			provider: testCase.provider,
			fixture: 'scalars',
		})
	})

	// Prisma creates DOUBLE for Float on MySQL; `providers/mysql.ts:249` (`Float`) emits
	// drizzle `float(...)` (single precision FLOAT) unless `@db.Double` is set
	test.failing('mysql Float is a double', async () => {
		const files = await generateFromSchema(mysql)
		expect(files['scalars.ts']).toContain("double('float')")
	})
})
