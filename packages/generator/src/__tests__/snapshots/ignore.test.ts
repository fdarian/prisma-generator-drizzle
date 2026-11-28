import { describe, test } from 'bun:test'
import {
	type Provider,
	datasource,
	expectSchemaToMatchSnapshots,
} from '../harness'

const models = `
model Visible {
  id      Int    @id
  name    String
  hidden  String? @ignore
}

model Hidden {
  id   Int    @id
  name String

  @@ignore
}
`

describe('@ignore and @@ignore', () => {
	test.each<Provider>(['postgres', 'mysql', 'sqlite'])(
		'%s',
		async (provider) => {
			await expectSchemaToMatchSnapshots(datasource(provider) + models, {
				provider,
				fixture: 'ignore',
			})
		}
	)
})
