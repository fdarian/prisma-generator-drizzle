import { boolean, pipe, string, union } from 'valibot'
import { transform } from 'valibot'

export const BooleanInStr = pipe(
	union([string(), boolean()]),
	transform((value) => {
		if (typeof value === 'string') return value.toLowerCase() === 'true'

		return value
	})
)
