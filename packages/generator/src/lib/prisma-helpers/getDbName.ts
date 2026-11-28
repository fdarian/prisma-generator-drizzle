/** `getDbName?: never` rejects a `SchemaField`, whose own `getDbName()` is the one that honours `@map` */
export function getDbName(dmmf: {
	dbName?: string | null
	name: string
	getDbName?: never
}) {
	return dmmf.dbName ?? dmmf.name
}
