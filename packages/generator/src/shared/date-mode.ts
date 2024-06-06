import { parse, picklist } from 'valibot'
import type { ParsableField } from '~/lib/adapter/adapter'
import { getDirective } from '~/lib/directive'
import { getGenerator } from './generator-context'

export const DateMode = picklist(['string', 'date']);

export function getDateMode(field: ParsableField) {
	const directive = getDirective(field, 'drizzle.dateMode')
	if (directive) return parse(DateMode, directive)

	return getGenerator().config.dateMode ?? 'date'
}
