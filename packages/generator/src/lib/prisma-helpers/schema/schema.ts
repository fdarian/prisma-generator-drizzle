import type { Schema as AstSchema } from '@mrleebo/prisma-ast'
import type { DMMF } from '@prisma/generator-helper'

export function createSchema(args: {
	astSchema: AstSchema
	dmmf: {
		datamodel: DMMF.Datamodel
	}
}) {
	return {
		/** @deprecated this will be hidden */
		ast: args.astSchema,
		/** @deprecated this will be hidden */
		dmmf: args.dmmf,
	}
}

export type Schema = ReturnType<typeof createSchema>
