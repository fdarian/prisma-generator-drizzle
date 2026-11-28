import { describe, expect, test } from 'bun:test'
import type { DMMF } from '@prisma/generator-helper'
import { createSchemaModel } from '~/lib/prisma-helpers/schema/schema-model'
import { createImplicitJoinTable } from '../declarations/generateTableRelationsDeclaration'
import { collectImplicitJoinModels } from './relational'

function modelIn(name: string) {
	return createSchemaModel({
		dmmfModel: {
			name,
			schema: null,
			dbName: null,
			fields: [{ name: 'id', kind: 'scalar', isId: true, type: 'String' }],
		} as unknown as DMMF.Model,
	})
}

function joinModelOf(baseName: string) {
	return createImplicitJoinTable({
		baseName,
		models: [modelIn('Author'), modelIn('Book')],
		isUniqueForPair: false,
	}).model
}

describe('collectImplicitJoinModels', () => {
	test('collects the join model of a relation once, however many sides produce it', () => {
		const likes = joinModelOf('Likes')
		const saves = joinModelOf('Saves')

		expect(collectImplicitJoinModels([likes, saves, likes, saves])).toEqual([
			likes,
			saves,
		])
	})

	test('rejects relation names that normalize to the same model name', () => {
		expect(() =>
			collectImplicitJoinModels([
				joinModelOf('post_likes'),
				joinModelOf('PostLikes'),
			])
		).toThrow(/post_likes and _PostLikes generate the same model name/)
	})

	test('rejects relation names that pluralize to the same variable name', () => {
		expect(() =>
			collectImplicitJoinModels([joinModelOf('Like'), joinModelOf('Likes')])
		).toThrow(
			/_Like and _Likes generate the same variable name "authorsToBooksLikes"/
		)
	})
})
