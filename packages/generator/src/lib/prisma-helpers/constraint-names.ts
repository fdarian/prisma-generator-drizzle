const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Lengths are UTF-8 bytes and the cut backs off to a character boundary, as in prisma-engines. */
function truncateBytes(value: string, limit: number) {
	const bytes = encoder.encode(value)
	if (bytes.length <= limit) return value

	let end = limit
	// Continuation bytes (0b10xxxxxx) are not the start of a character
	while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--
	return decoder.decode(bytes.subarray(0, end))
}

/** Mirrors `ConstraintNames::index_name_impl` and `foreign_key_constraint_name` in prisma-engines */
export function getDefaultConstraintName(args: {
	tableName: string
	columnNames: string[]
	suffix: '_fkey' | '_key' | '_idx'
	maxIdentifierLength: number
}) {
	const joined = `${args.tableName}_${args.columnNames.join('_')}`
	return `${truncateBytes(joined, args.maxIdentifierLength - args.suffix.length)}${args.suffix}`
}

export function getDefaultPrimaryKeyName(args: {
	tableName: string
	maxIdentifierLength: number
}) {
	const suffix = '_pkey'
	return `${truncateBytes(args.tableName, args.maxIdentifierLength - suffix.length)}${suffix}`
}

/**
 * Names of the constraints Prisma creates on implicit many-to-many join tables.
 * Unlike the other names these are cut by characters (`.chars().take(n)`), not bytes.
 */
export function getImplicitJoinTableConstraintName(args: {
	tableName: string
	suffix: '_AB_pkey' | '_AB_unique' | '_B_index'
	maxIdentifierLength: number
}) {
	const kept = Array.from(args.tableName).slice(
		0,
		args.maxIdentifierLength - args.suffix.length
	)
	return `${kept.join('')}${args.suffix}`
}
