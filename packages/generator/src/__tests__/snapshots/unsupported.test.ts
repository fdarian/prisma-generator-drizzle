import { describe, test } from 'bun:test'
import {
	type Provider,
	datasource,
	expectSchemaToMatchSnapshots,
} from '../harness'

const unsupportedType: Record<Provider, string> = {
	postgres: 'circle',
	mysql: 'point',
	sqlite: 'polygon',
}

function models(provider: Provider) {
	return `
model Place {
  id       Int     @id
  name     String
  area     Unsupported("${unsupportedType[provider]}")
  areaOpt  Unsupported("${unsupportedType[provider]}")?
}
`
}

describe('Unsupported()', () => {
	test.each<Provider>(['postgres', 'mysql', 'sqlite'])(
		'%s',
		async (provider) => {
			await expectSchemaToMatchSnapshots(
				datasource(provider) + models(provider),
				{
					provider,
					fixture: 'unsupported',
				}
			)
		}
	)
})
