/** `getDbName?: never` rejects a `SchemaField`: it has no `dbName`, so it would silently fall back to `name`. Use `SchemaField.getDbName()` instead */
export function getDbName(dmmf: {
	dbName?: string | null
	name: string
	getDbName?: never
}) {
	return dmmf.dbName ?? dmmf.name
}
