import { getEnumModuleName } from '~/lib/prisma-helpers/enums'
import { createModule } from '~/lib/syntaxes/module'
import { getGenerator } from '~/shared/generator-context'
import { generateEnumDeclaration } from '../declarations/generateEnumDeclaration'
import type { Adapter } from '../types'

export function generateEnumModules(adapter: Adapter) {
	return (getGenerator().dmmf.datamodel.enums ?? []).map((prismaEnum) =>
		createModule({
			name: getEnumModuleName(prismaEnum),
			declarations: [generateEnumDeclaration(adapter, prismaEnum)],
		})
	)
}
