import { describe, expect, test } from 'bun:test'
import { createPrismaSchemaBuilder } from '@mrleebo/prisma-ast'
import type { DMMF } from '@prisma/generator-helper'
import { findEnumSchema } from './schema-enum'

function parse(datamodel: string) {
	return createPrismaSchemaBuilder(datamodel).getSchema()
}

function enumNamed(name: string) {
	return { name } as DMMF.DatamodelEnum
}

describe('findEnumSchema', () => {
	const schema = parse(`
enum Role {
  A
  B
  @@map("roles")
  @@schema("auth")
}

enum Plain {
  X
}
`)

	test('reads @@schema among other block attributes', () => {
		expect(findEnumSchema(schema, enumNamed('Role'))).toBe('auth')
	})

	test('is null without @@schema', () => {
		expect(findEnumSchema(schema, enumNamed('Plain'))).toBe(null)
	})

	test('throws for an enum missing from the ast', () => {
		expect(() => findEnumSchema(schema, enumNamed('Missing'))).toThrow(
			'Cannot find corresponding ast enum for Missing'
		)
	})
})
