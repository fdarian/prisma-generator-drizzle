import { getEnumModuleName } from '~/lib/prisma-helpers/enums'
import type { Schema } from '~/lib/prisma-helpers/schema/schema'
import { findEnumSchema } from '~/lib/prisma-helpers/schema/schema-enum'
import { createModule } from '~/lib/syntaxes/module'
import { generateEnumDeclaration } from '../declarations/generateEnumDeclaration'
import type { Adapter } from '../types'

export function generateEnumModules(adapter: Adapter, schema: Schema) {
	return schema.dmmf.datamodel.enums.map((prismaEnum) => {
		const dbSchema = findEnumSchema(schema.ast, prismaEnum)
		return createModule({
			name: getEnumModuleName(prismaEnum),
			dbSchema,
			declarations: [generateEnumDeclaration(adapter, prismaEnum, dbSchema)],
		})
	})
}

export type EnumModule = ReturnType<typeof generateEnumModules>[number]
