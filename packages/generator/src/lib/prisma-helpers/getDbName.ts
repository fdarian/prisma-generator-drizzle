export function getDbName(field: { dbName?: string | null; name: string }) {
  return field.dbName ?? field.name
}
