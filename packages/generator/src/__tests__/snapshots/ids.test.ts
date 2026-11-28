import { describe, expect, test } from 'bun:test'
import {
	type Provider,
	datasource,
	expectSchemaToMatchSnapshots,
	generateFromSchema,
} from '../harness'

const models = `
model IntId {
  id Int @id
}

model StringId {
  id String @id
}

model BigIntId {
  id BigInt @id
}

model CompositeId {
  tenantId Int
  slug     String
  title    String

  @@id([tenantId, slug])
}

model CompositeMappedId {
  firstName String @map("first_name")
  lastName  String

  @@id([firstName, lastName])
}
`

describe('ids', () => {
	test.each<Provider>(['postgres', 'mysql', 'sqlite'])(
		'%s',
		async (provider) => {
			await expectSchemaToMatchSnapshots(datasource(provider) + models, {
				provider,
				fixture: 'ids',
			})
		}
	)

	// generateTableDeclaration.ts never reads the model's primaryKey, so @@id is dropped
	test.failing.each<Provider>(['postgres', 'mysql', 'sqlite'])(
		'%s composite @@id emits a primaryKey constraint',
		async (provider) => {
			const files = await generateFromSchema(datasource(provider) + models)
			expect(files['composite-ids.ts']).toMatch(/primaryKey\(\{ columns: \[/)
		}
	)
})
