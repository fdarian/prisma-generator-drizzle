export function throwIfnull<T>(data: T | undefined) {
	if (data == null) throw new Error('data is null')
	return data
}
