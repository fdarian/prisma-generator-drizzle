import { createPrismaSchemaBuilder } from '@mrleebo/prisma-ast'
import type { DMMF } from '@prisma/generator-helper'
import { describe, expect, it } from 'vitest'
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

	it('reads @@schema among other block attributes', () => {
		expect(findEnumSchema(schema, enumNamed('Role'))).toBe('auth')
	})

	it('is null without @@schema', () => {
		expect(findEnumSchema(schema, enumNamed('Plain'))).toBe(null)
	})

	it('throws for an enum missing from the ast', () => {
		expect(() => findEnumSchema(schema, enumNamed('Missing'))).toThrow(
			'Cannot find corresponding ast enum for Missing'
		)
	})
})
