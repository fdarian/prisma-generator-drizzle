import type { GeneratorOptions } from '@prisma/generator-helper'
import { getEnumModuleName } from '~/lib/prisma-helpers/enums'
import { createModule } from '~/lib/syntaxes/module'
import { generateEnumDeclaration } from '../declarations/generateEnumDeclaration'
import type { Adapter } from '../types'

export function generateEnumModules(
	options: GeneratorOptions,
	adapter: Adapter
) {
	return (options.dmmf.datamodel.enums ?? []).map((prismaEnum) =>
		createModule({
			name: getEnumModuleName(prismaEnum),
			declarations: [generateEnumDeclaration(adapter, prismaEnum)],
		})
	)
}
