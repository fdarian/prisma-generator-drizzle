import type { DMMF } from '@prisma/generator-helper'
import { describe, expect, it } from 'vitest'
import { createSchemaModel } from '~/lib/prisma-helpers/schema/schema-model'
import { createImplicitJoinTable } from './generateTableRelationsDeclaration'

function modelIn(name: string, schema: string | null) {
	return createSchemaModel({
		dmmfModel: {
			name,
			schema,
			dbName: null,
			fields: [{ name: 'id', isId: true }],
		} as unknown as DMMF.Model,
	})
}

describe('createImplicitJoinTable', () => {
	it.each([
		['Post', 'blog', 'Tag', 'public', 'blog'],
		['Tag', 'public', 'User', 'auth', 'public'],
	])(
		'places %s(%s) + %s(%s) join table in %s, the schema of the first model by name',
		(a, aSchema, b, bSchema, expected) => {
			const forward = createImplicitJoinTable('rel', [
				modelIn(a, aSchema),
				modelIn(b, bSchema),
			])
			const reversed = createImplicitJoinTable('rel', [
				modelIn(b, bSchema),
				modelIn(a, aSchema),
			])

			expect(forward.model.schema).toBe(expected)
			expect(reversed.model.schema).toBe(expected)
		}
	)

	it('stays schemaless when the models are', () => {
		const result = createImplicitJoinTable('rel', [
			modelIn('Post', null),
			modelIn('Tag', null),
		])

		expect(result.model.schema).toBe(null)
	})
})
