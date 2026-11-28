import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'

export type NativeType = { name: string; args: number[] }

export function getNativeType(field: SchemaField): NativeType | undefined {
	if (field.nativeType == null) return

	return {
		name: field.nativeType[0],
		args: field.nativeType[1].map((arg) => {
			const value = Number(arg)
			if (!Number.isInteger(value)) {
				throw new Error(
					`Unsupported @db.${field.nativeType?.[0]} argument "${arg}" on field "${field.name}": expected an integer`
				)
			}
			return value
		}),
	}
}

type OptionValue = string | number | boolean | undefined

/**
 * Renders `builder('name', { ...options })`, omitting undefined options and the
 * options object when none remain. String option values are emitted verbatim,
 * so they must already be quoted.
 */
export function renderColumn(
	builder: string,
	name: string,
	options: Record<string, OptionValue> = {}
) {
	const entries = Object.entries(options).filter(
		(entry): entry is [string, string | number | boolean] =>
			entry[1] !== undefined
	)
	if (entries.length === 0) return `${builder}('${name}')`

	return `${builder}('${name}', { ${entries
		.map(([key, value]) => `${key}: ${value}`)
		.join(', ')} })`
}
