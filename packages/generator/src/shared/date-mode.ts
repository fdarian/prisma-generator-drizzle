import { parse, picklist } from 'valibot'
import { getDirective } from '~/lib/directive'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'
import { getGenerator } from './generator-context'

export const DateMode = picklist(['string', 'date'])

export function getDateMode(field: SchemaField) {
	const directive = getDirective(field, 'drizzle.dateMode')
	if (directive) return parse(DateMode, directive)

	return getGenerator().config.dateMode ?? 'date'
}
