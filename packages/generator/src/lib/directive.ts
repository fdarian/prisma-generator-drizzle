import type { DMMF } from '@prisma/generator-helper'

/**
 * e.g.
 * Unknown
 * - Input: just a doc
 * - Returns: undefined
 * When Exists
 * - Input: drizzle.type viem::Address
 * - Returns: viem:Address
 */
export function getDirective(field: DMMF.Field, directive: string) {
	if (field.documentation == null) return

	return field.documentation
		.split('\n')
		.find((doc) => doc.startsWith(directive))
		?.replaceAll(directive, '')
		.trim()
}
