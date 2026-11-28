import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { relations } from '../prisma/drizzle/relations.js'

export const sqlite = new Database(
	fileURLToPath(new URL('../prisma/test.db', import.meta.url))
)

export const db = drizzle({ client: sqlite, relations })

export function clearTables() {
	const tables = sqlite
		.prepare(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_prisma%' ESCAPE '\\' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'"
		)
		.all() as { name: string }[]

	sqlite.pragma('foreign_keys = OFF')
	for (const table of tables) {
		sqlite.prepare(`DELETE FROM "${table.name}"`).run()
	}
	sqlite.pragma('foreign_keys = ON')
}
