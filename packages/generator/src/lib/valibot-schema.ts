import { coerce, literal, union } from 'valibot'
import {
	type BaseSchema,
	type OptionalSchema,
	type Output,
	transform,
} from 'valibot'

export function withDefault<Schema extends OptionalSchema<BaseSchema>>(
	schema: Schema,
	value: Output<Schema['wrapped']>
) {
	return transform(schema, (val) => val ?? value)
}

export const BooleanInStr = transform(
	coerce(union([literal('true'), literal('false')]), (value) => {
		if (typeof value !== 'string') return value
		return value.toLowerCase() === 'true'
	}),
	(value) => value === 'true'
)
