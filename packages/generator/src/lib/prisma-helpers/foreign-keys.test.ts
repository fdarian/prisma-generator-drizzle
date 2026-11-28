import { getSchema } from '@mrleebo/prisma-ast'
import type { DMMF } from '@prisma/generator-helper'
import { describe, expect, it, vi } from 'vitest'
import { generateTableDeclaration } from '../adapter/declarations/generateTableDeclaration'
import { sqliteAdapter } from '../adapter/providers/sqlite'
import { getForeignKeys } from './foreign-keys'
import { createSchema } from './schema/schema'
import { createSchemaModel } from './schema/schema-model'

vi.mock('~/shared/generator-context', () => ({
	getModuleResolution: () => undefined,
}))

function scalar(name: string, isRequired = true): DMMF.Field {
	return {
		name,
		kind: 'scalar',
		type: 'String',
		isRequired,
		isList: false,
		isId: name === 'id',
		isUnique: false,
		isReadOnly: false,
		hasDefaultValue: false,
		isGenerated: false,
		isUpdatedAt: false,
	}
}

function relation(
	name: string,
	type: string,
	from: string[],
	to: string[]
): DMMF.Field {
	return {
		...scalar(name),
		kind: 'object',
		type,
		relationName: `${name}_relation`,
		relationFromFields: from,
		relationToFields: to,
	}
}

function dmmfModel(name: string, fields: DMMF.Field[]): DMMF.Model {
	return {
		name,
		dbName: null,
		schema: null,
		fields,
		uniqueFields: [],
		uniqueIndexes: [],
		primaryKey: null,
	}
}

function setup(source: string, models: DMMF.Model[], modelName: string) {
	const astSchema = getSchema(source)
	const schema = createSchema({
		astSchema,
		dmmf: { datamodel: { models, enums: [], types: [], indexes: [] } },
	})
	const dmmf = models.find((m) => m.name === modelName)
	const astModel = astSchema.list.find(
		(block) => block.type === 'model' && block.name === modelName
	)
	if (dmmf == null || astModel?.type !== 'model') {
		throw new Error(`Model ${modelName} not found`)
	}
	return { schema, model: createSchemaModel({ dmmfModel: dmmf, astModel }) }
}

const target = (name: string) => dmmfModel(name, [scalar('id')])

describe('getForeignKeys', () => {
	it('throws when the target model is unknown and not ignored', () => {
		const { schema, model } = setup(
			'model Post {\n id String @id\n authorId String\n author Author @relation(fields: [authorId], references: [id])\n}',
			[
				dmmfModel('Post', [
					scalar('id'),
					scalar('authorId'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
			],
			'Post'
		)
		expect(() => getForeignKeys(schema, model)).toThrow(/unknown model Author/)
	})

	it('skips a relation whose local column is @ignore d', () => {
		const { schema, model } = setup(
			`model Post {
				id String @id
				authorId String @ignore
				author Author @relation(fields: [authorId], references: [id])
			}
			model Author {
				id String @id
			}`,
			[
				dmmfModel('Post', [
					scalar('id'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		expect(getForeignKeys(schema, model)).toEqual([])
	})

	it('throws when a local column is missing and not @ignore d', () => {
		const { schema, model } = setup(
			`model Post {
				id String @id
				authorId String
				author Author @relation(fields: [authorId], references: [id])
			}
			model Author {
				id String @id
			}`,
			[
				dmmfModel('Post', [
					scalar('id'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		expect(() => getForeignKeys(schema, model)).toThrow(
			/references unknown fields authorId/
		)
	})

	it('throws when the AST field of a regular model is missing', () => {
		const { schema, model } = setup(
			'model Post {\n id String @id\n}',
			[
				dmmfModel('Post', [
					scalar('id'),
					scalar('authorId'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		expect(() => getForeignKeys(schema, model)).toThrow(
			/Ast field authorId not found/
		)
	})
})

describe('generateTableDeclaration foreign keys', () => {
	it('moves every foreign key of a shared column into the config callback', () => {
		const { schema, model } = setup(
			`model Shared {
				id String @id
				sharedId String
				first First @relation(fields: [sharedId], references: [id])
				second Second @relation(fields: [sharedId], references: [id])
			}`,
			[
				dmmfModel('Shared', [
					scalar('id'),
					scalar('sharedId'),
					relation('first', 'First', ['sharedId'], ['id']),
					relation('second', 'Second', ['sharedId'], ['id']),
				]),
				target('First'),
				target('Second'),
			],
			'Shared'
		)
		const output = generateTableDeclaration(sqliteAdapter, schema, model)
		expect(output.code).not.toContain('.references(')
		expect(output.code).toContain('foreignColumns: [firsts.id]')
		expect(output.code).toContain('foreignColumns: [seconds.id]')
	})

	it('escapes the constraint name', () => {
		const { schema, model } = setup(
			`model Post {
				id String @id
				authorId String
				author Author @relation(fields: [authorId], references: [id], map: "it's_fk")
			}`,
			[
				dmmfModel('Post', [
					scalar('id'),
					scalar('authorId'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		const output = generateTableDeclaration(sqliteAdapter, schema, model)
		expect(output.code).toContain(`name: "it's_fk"`)
	})

	it('annotates the config callback return type', () => {
		const { schema, model } = setup(
			`model Post {
				id String @id
				authorId String
				author Author @relation(fields: [authorId], references: [id], map: "post_author")
			}`,
			[
				dmmfModel('Post', [
					scalar('id'),
					scalar('authorId'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		const output = generateTableDeclaration(sqliteAdapter, schema, model)
		expect(output.code).toContain(
			'(table): SQLiteTableExtraConfigValue[] => [foreignKey('
		)
	})
})
