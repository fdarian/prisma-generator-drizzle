import { test } from 'bun:test'
import { datasource, expectSchemaToMatchSnapshots } from '../harness'

const models = `
enum Role {
  ADMIN
  USER

  @@schema("auth")
}

enum Level {
  LOW
  HIGH

  @@schema("public")
}

model Session {
  id    Int  @id
  role  Role

  @@schema("auth")
}

model Audit {
  id    Int    @id
  level Level
  note  String

  @@map("audit_log")
  @@schema("audit-trail")
}

model Plain {
  id Int @id

  @@schema("public")
}
`

test('multi-schema (postgres)', async () => {
	await expectSchemaToMatchSnapshots(
		datasource('postgres', ['schemas = ["public", "auth", "audit-trail"]']) +
			models,
		{ provider: 'postgres', fixture: 'multi-schema' }
	)
})
