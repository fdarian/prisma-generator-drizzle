import fs from 'node:fs'
import type { TestContext } from 'tests/utils/types'
import { beforeAll, describe, expect, test } from 'vitest'

export type SomeBigInt = bigint

const OUTPUT_DIRS = {
	postgres: './prisma/drizzle',
	mysql: './prisma/mysql/drizzle',
	sqlite: './prisma/sqlite/drizzle',
} satisfies Record<TestContext['provider'], string>

// sqlite has no native bigint column, so the generator emits a custom one
const BIGINT_COLUMNS = {
	postgres: "bigint('allFields', { mode: 'number' })",
	mysql: "bigint('allFields', { mode: 'number' })",
	sqlite: "customBigInt('allFields')",
} satisfies Record<TestContext['provider'], string>

export function testFieldCustomization(ctx: TestContext) {
	const outputFile = `${OUTPUT_DIRS[ctx.provider]}/field-customizations.ts`
	let content: string
	beforeAll(async () => {
		expect(fs.existsSync(outputFile)).toBe(true)
		content = fs.readFileSync(outputFile, 'utf-8')
	})

	describe('allFields', () => {
		test('should contain import', () => {
			expect(content).include(
				"import type { SomeBigInt } from '~/tests/shared/testFieldCustomization'"
			)
		})

		test('should contain correct field definition', () => {
			expect(content).include(
				`allFields: ${BIGINT_COLUMNS[ctx.provider]}.$type<SomeBigInt>().$defaultFn(() => 1n)`
			)
		})
	})
}
