import type { BinaryOperator, Column, GetColumnData } from 'drizzle-orm'

export function throwIfnull<T>(data: T | undefined) {
	if (data == null) throw new Error('data is null')
	return data
}

export function shouldReturnOne<T>(results: Array<T>): T {
	const result = results.at(0)
	if (result == null)
		throw new Error(`Expected one result from ${results}, got none`)
	return result
}

export function matchesId<TColumn extends Column>(
	id: GetColumnData<TColumn, 'raw'>
) {
	return (table: { id: TColumn }, { eq }: { eq: BinaryOperator }) =>
		eq(table.id, id)
}
