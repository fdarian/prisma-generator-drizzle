import { describe, expect, test } from 'bun:test'
import type { DMMF } from '@prisma/generator-helper'
import { createSchemaModel } from '~/lib/prisma-helpers/schema/schema-model'
import { createImplicitJoinTable } from './generateTableRelationsDeclaration'

function modelIn(
	name: string,
	schema: string | null,
	id: Partial<DMMF.Field> = {}
) {
	return createSchemaModel({
		dmmfModel: {
			name,
			schema,
			dbName: null,
			fields: [{ name: 'id', isId: true, type: 'String', ...id }],
		} as unknown as DMMF.Model,
	})
}

function joinTableOf(
	models: [ReturnType<typeof modelIn>, ReturnType<typeof modelIn>],
	options: { baseName?: string; isUniqueForPair?: boolean } = {}
) {
	return createImplicitJoinTable({
		baseName: options.baseName ?? 'rel',
		models,
		isUniqueForPair: options.isUniqueForPair ?? true,
	})
}

function fieldOf(result: ReturnType<typeof joinTableOf>, name: string) {
	const field = result.model.fields.find((f) => f.name === name)
	if (field == null) throw new Error(`field ${name} not found`)
	return field
}

describe('createImplicitJoinTable', () => {
	test.each([
		['Post', 'blog', 'Tag', 'public', 'blog'],
		['Tag', 'public', 'User', 'auth', 'public'],
	])(
		'places %s(%s) + %s(%s) join table in %s, the schema of the first model by name',
		(a, aSchema, b, bSchema, expected) => {
			const forward = joinTableOf([modelIn(a, aSchema), modelIn(b, bSchema)])
			const reversed = joinTableOf([modelIn(b, bSchema), modelIn(a, aSchema)])

			expect(forward.model.schema).toBe(expected)
			expect(reversed.model.schema).toBe(expected)
		}
	)

	test('stays schemaless when the models are', () => {
		const result = joinTableOf([modelIn('Post', null), modelIn('Tag', null)])

		expect(result.model.schema).toBe(null)
	})

	test('copies the column type of A and B from the referenced ids', () => {
		const result = joinTableOf([
			modelIn('Post', null, { type: 'Int' }),
			modelIn('Tag', null, { type: 'String', nativeType: ['Uuid', []] }),
		])

		expect(fieldOf(result, 'A')).toMatchObject({ type: 'Int' })
		expect(fieldOf(result, 'A')).not.toHaveProperty('nativeType')
		expect(fieldOf(result, 'B')).toMatchObject({
			type: 'String',
			nativeType: ['Uuid', []],
		})
	})

	test('names the join table after both models when it is the only one for the pair', () => {
		const result = joinTableOf([modelIn('Post', null), modelIn('Tag', null)], {
			baseName: 'CategoryToPost',
		})

		expect(result.varName).toBe('postsToTags')
		expect(result.model.name).toBe('PostsToTags')
		expect(result.model.dbName).toBe('_CategoryToPost')
	})

	test('adds the relation name to the join table name when the pair has several', () => {
		const result = joinTableOf([modelIn('Post', null), modelIn('Tag', null)], {
			baseName: 'PostEditors',
			isUniqueForPair: false,
		})

		expect(result.varName).toBe('postsToTagsPostEditors')
		expect(result.model.name).toBe('PostsToTagsPostEditors')
	})

	test('suffixes the join fields and relation names of a self relation with A and B', () => {
		const result = joinTableOf([modelIn('User', null), modelIn('User', null)], {
			baseName: 'Friends',
		})

		expect(result.varName).toBe('usersToUsers')
		expect(fieldOf(result, 'userA')).toMatchObject({
			type: 'User',
			relationName: 'Friends_A',
			relationFromFields: ['A'],
		})
		expect(fieldOf(result, 'userB')).toMatchObject({
			type: 'User',
			relationName: 'Friends_B',
			relationFromFields: ['B'],
		})
	})
})
