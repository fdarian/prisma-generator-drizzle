import type { SchemaField } from './prisma-helpers/schema/schema-field'

/**
 * e.g.
 * Unknown
 * - Input: just a doc
 * - Returns: undefined
 * When Exists
 * - Input: drizzle.type viem::Address
 * - Returns: viem:Address
 */
export function getDirective(field: SchemaField, directive: string) {
	if (field.documentation == null) return

	return field.documentation
		.split('\n')
		.find((doc) => doc.startsWith(directive))
		?.replaceAll(directive, '')
		.trim()
}
