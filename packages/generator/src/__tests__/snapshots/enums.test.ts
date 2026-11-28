import { describe, test } from 'bun:test'
import {
	type Provider,
	datasource,
	expectSchemaToMatchSnapshots,
} from '../harness'

const models = `
enum Role {
  ADMIN
  EDITOR
  GUEST
}

enum Status {
  ACTIVE   @map("active")
  INACTIVE @map("in-active")
  PENDING_REVIEW
}

enum Visibility {
  PUBLIC
  PRIVATE

  @@map("visibility_kind")
}

model Account {
  id         Int         @id
  role       Role
  roleOpt    Role?
  roleDef    Role        @default(EDITOR)
  status     Status      @default(INACTIVE)
  statusOpt  Status?
  visibility Visibility  @default(PRIVATE)
}
`

describe('enums', () => {
	test.each<Provider>(['postgres', 'mysql'])('%s', async (provider) => {
		await expectSchemaToMatchSnapshots(datasource(provider) + models, {
			provider,
			fixture: 'enums',
		})
	})
})
