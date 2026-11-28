import { describe, expect, test } from 'bun:test'
import { type Provider, datasource, generateFromSchema } from '../harness'

const providers: Provider[] = ['postgres', 'mysql', 'sqlite']

describe('unique', () => {
	// No `.unique()`, `unique()` or `uniqueIndex()` is emitted for `@unique` fields:
	// `createField.ts:96-99` (the `.primaryKey()` / `.notNull()` suffix) never reads `field.isUnique`
	test.failing.each(providers)(
		'%s @unique field carries a unique constraint',
		async (provider) => {
			const files = await generateFromSchema(`${datasource(provider)}
model Ticket {
  id  Int    @id
  ref String @unique
}
`)
			expect(files['tickets.ts']).toMatch(/\bunique(Index)?\(/)
		}
	)
})
