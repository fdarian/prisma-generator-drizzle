import { describe, test } from 'bun:test'
import {
	type Provider,
	datasource,
	expectSchemaToMatchSnapshots,
} from '../harness'

const models = `
model Post {
  id          Int       @id
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  mappedAt    DateTime  @updatedAt @map("mapped_at")
  optionalAt  DateTime? @updatedAt
}
`

describe('updatedAt', () => {
	test.each<Provider>(['postgres', 'mysql', 'sqlite'])(
		'%s',
		async (provider) => {
			await expectSchemaToMatchSnapshots(datasource(provider) + models, {
				provider,
				fixture: 'updated-at',
			})
		}
	)
})
