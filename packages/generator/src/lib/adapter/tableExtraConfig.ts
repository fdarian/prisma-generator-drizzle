import { namedImport } from '../syntaxes/imports'

/**
 * The callback return type is annotated because tables whose foreign keys
 * point at each other would otherwise make TypeScript infer `any` (TS7022).
 */
export function createTableExtraConfig(args: {
	coreModule: string
	extraConfigValueType: string
	entries: string[]
}) {
	if (args.entries.length === 0) return { imports: [], code: '' }

	return {
		imports: [namedImport([args.extraConfigValueType], args.coreModule, true)],
		code: `, (table): ${args.extraConfigValueType}[] => [${args.entries.join(', ')}]`,
	}
}
