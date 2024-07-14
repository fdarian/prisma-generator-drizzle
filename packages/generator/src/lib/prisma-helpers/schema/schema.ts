import type { Schema as AstSchema } from '@mrleebo/prisma-ast'
import type { DMMF } from '@prisma/generator-helper'

export function createSchema(args: {
	astSchema: AstSchema
	dmmf: {
		datamodel: DMMF.Datamodel
	}
}) {
	return {
		ast: args.astSchema,
		dmmf: args.dmmf,
	}
}

export type Schema = ReturnType<typeof createSchema>
