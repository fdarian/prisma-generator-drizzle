import { describe, expect, test } from 'bun:test'
import {
	type Provider,
	datasource,
	expectSchemaToMatchSnapshots,
	generateFromSchema,
} from '../harness'

const models = `
model UserAccount {
  id        Int    @id @map("user_id")
  firstName String @map("first_name")
  lastName  String

  @@map("user_accounts")
}

model Unmapped {
  id        Int    @id
  fieldName String @map("field_name")
}
`

describe('field and model mapping', () => {
	test.each<Provider>(['postgres', 'mysql', 'sqlite'])(
		'%s',
		async (provider) => {
			await expectSchemaToMatchSnapshots(datasource(provider) + models, {
				provider,
				fixture: 'field-mapping',
			})
		}
	)

	test.each<Provider>(['postgres', 'mysql', 'sqlite'])(
		'%s column names follow field @map',
		async (provider) => {
			const files = await generateFromSchema(datasource(provider) + models)
			expect(files['user-accounts.ts']).toContain("'first_name'")
			expect(files['user-accounts.ts']).toContain("'user_id'")
		}
	)
})
