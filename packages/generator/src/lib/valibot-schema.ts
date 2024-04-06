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
