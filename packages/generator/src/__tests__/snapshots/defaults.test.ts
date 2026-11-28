import { describe, expect, test } from 'bun:test'
import {
	type Provider,
	datasource,
	expectSchemaToMatchSnapshots,
	generateFromSchema,
} from '../harness'

const dbgenerated: Record<Provider, string> = {
	postgres: 'gen_random_uuid()',
	mysql: '(uuid())',
	sqlite: '(lower(hex(randomblob(16))))',
}

function models(provider: Provider) {
	return `
model AutoInt {
  id Int @id @default(autoincrement())
}

model AutoBigInt {
  id BigInt @id @default(autoincrement())
}

model Generated {
  id      Int      @id
  now     DateTime @default(now())
  uuid    String   @default(uuid())
  cuid    String   @default(cuid())
  dbValue String   @default(dbgenerated("${dbgenerated[provider]}"))
}

model Literals {
  id       Int      @id
  string   String   @default("hello")
  int      Int      @default(42)
  negInt   Int      @default(-7)
  bigInt   BigInt   @default(9007199254740993)
  float    Float    @default(1.5)
  decimal  Decimal  @default(12.34)
  boolTrue Boolean  @default(true)
  boolFalse Boolean @default(false)
  dateTime DateTime @default("2024-01-02T03:04:05.000Z")
  bytes    Bytes    @default("aGVsbG8=")
${
	provider === 'sqlite'
		? ''
		: `  json     Json     @default("{\\"a\\":1}")
`
}}
`
}

const enumDefault = `
enum Color {
  RED
  GREEN @map("green")
}

model Paint {
  id      Int   @id
  color   Color @default(RED)
  mapped  Color @default(GREEN)
}
`

describe('defaults', () => {
	test.each<Provider>(['postgres', 'mysql', 'sqlite'])(
		'%s',
		async (provider) => {
			await expectSchemaToMatchSnapshots(
				datasource(provider) + models(provider),
				{
					provider,
					fixture: 'defaults',
				}
			)
		}
	)

	test.each<Provider>(['postgres', 'mysql'])(
		'%s enum defaults',
		async (provider) => {
			await expectSchemaToMatchSnapshots(datasource(provider) + enumDefault, {
				provider,
				fixture: 'defaults-enum',
			})
		}
	)

	// generateds.ts: `BigInt(9007199254740993)` rounds to ...992 as a number literal
	// (createField.ts, getDefaultScalarDefinition, `case 'BigInt'`)
	test.failing(
		'postgres BigInt default beyond 2^53 keeps its precision',
		async () => {
			const files = await generateFromSchema(
				datasource('postgres') + models('postgres')
			)
			expect(files['literals.ts']).toMatch(
				/BigInt\('9007199254740993'\)|9007199254740993n/
			)
		}
	)

	// createField.ts, getDefaultScalarDefinition, `case 'String'`: emits 'it's'
	test.failing(
		'postgres String default with an apostrophe is escaped',
		async () => {
			const files = await generateFromSchema(`${datasource('postgres')}
model Quoted {
  id   Int    @id
  text String @default("it's")
}
`)
			expect(files['quoteds.ts']).toContain("it\\'s")
		}
	)
})
