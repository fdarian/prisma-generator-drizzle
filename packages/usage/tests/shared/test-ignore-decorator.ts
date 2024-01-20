import { Db, Schema } from 'src/lib/types'
import { TestContext } from 'tests/utils/types'
import { describe, expect, test } from 'vitest'

export function testIgnoreDecorator({ schema }: TestContext) {
	describe('@ignore', async () => {
		test('should not have ignored model', () => {
			expect(schema).not.toHaveProperty('IgnoredModel')
		})
	})

	describe('@@ignore', async () => {
		test('should not have ignored fields', () => {
			expect(schema.modelWithIgnoredFields).not.toHaveProperty(
				'shouldBeIgnored'
			)
		})
	})
}
