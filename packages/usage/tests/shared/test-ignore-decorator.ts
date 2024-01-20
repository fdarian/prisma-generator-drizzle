import { Db, Schema } from 'src/lib/types'
import { describe, expect, test } from 'vitest'

export function testIgnoreDecorator(db: Db, schema: Schema) {
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
