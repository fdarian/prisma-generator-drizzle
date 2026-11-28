import type { SchemaField } from './prisma-helpers/schema/schema-field'

/**
 * Finds a `<directive> <value>` line among the field's doc lines.
 *
 * e.g.
 * Unknown
 * - Input: just a doc
 * - Returns: undefined
 * When Exists
 * - Input: drizzle.type viem::Address
 * - Returns: viem::Address
 */
export function getDirective(field: SchemaField, directive: string) {
	if (field.documentation == null) return

	for (const line of field.documentation.split('\n')) {
		const trimmed = line.trimStart()
		if (!trimmed.startsWith(directive)) continue

		const rest = trimmed.slice(directive.length)
		if (rest === '' || /^\s/.test(rest)) return rest.trim()
	}
}
