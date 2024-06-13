import fs, { readFileSync } from 'node:fs'
import type { TestContext } from 'tests/utils/types'
import { beforeAll, describe, expect, test } from 'vitest'

export type SomeBigInt = bigint

export const OUTPUT_FILE = './prisma/drizzle/field-customizations.ts'

export function testFieldCustomization({ db, schema, provider }: TestContext) {
	let content: string
	beforeAll(async () => {
		expect(fs.existsSync(OUTPUT_FILE)).toBe(true)
		content = readFileSync(OUTPUT_FILE, 'utf-8')
	})

	describe('allFields', () => {
		test('should contain import', () => {
			expect(content).include(
				"import type { SomeBigInt } from '~/tests/shared/testFieldCustomization'"
			)
		})

		test('should contain correct field definition', () => {
			expect(content).include(
				"allFields: bigint('allFields', { mode: 'number' }).$type<SomeBigInt>().$defaultFn(() => 1n)"
			)
		})
	})
}
