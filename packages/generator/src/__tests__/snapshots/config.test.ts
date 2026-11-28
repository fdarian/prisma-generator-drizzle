import { describe, expect, test } from 'bun:test'
import {
	type Provider,
	datasource,
	expectFilesToMatchSnapshots,
	expectSchemaToMatchSnapshots,
	generateFromSchema,
} from '../harness'

const providers: Provider[] = ['postgres', 'mysql', 'sqlite']

// Relations and a column type with a helper module, so both the
// cross-module imports and the relational output are exercised
function models(provider: Provider) {
	return `${
		provider === 'sqlite'
			? ''
			: `
enum Status {
  DRAFT
  PUBLISHED
}
`
	}
model Author {
  id      Int      @id
  name    String
  joined  DateTime @default(now())
  balance Decimal
  posts   Post[]
}

model Post {
  id       Int      @id
  authorId Int
  author   Author   @relation(fields: [authorId], references: [id])
  views    BigInt
  payload  Bytes
  updated  DateTime @updatedAt
${provider === 'sqlite' ? '' : '  status   Status   @default(DRAFT)\n'}}
`
}

function schemaFor(provider: Provider) {
	return datasource(provider) + models(provider)
}

describe('relationalQuery', () => {
	test.each(providers)('%s false', async (provider) => {
		await expectSchemaToMatchSnapshots(
			schemaFor(provider),
			{ provider, fixture: 'config-relational-query-false' },
			{ config: { relationalQuery: 'false' } }
		)
	})

	test.each(providers)(
		'%s omits the relations and schema modules',
		async (provider) => {
			const files = await generateFromSchema(schemaFor(provider), {
				config: { relationalQuery: 'false' },
			})

			expect(
				Object.keys(files).filter((name) => /relations|schema/.test(name))
			).toEqual([])
		}
	)
})

describe('relations', () => {
	test.each(providers)('%s v2', async (provider) => {
		await expectSchemaToMatchSnapshots(
			schemaFor(provider),
			{ provider, fixture: 'config-relations-v2' },
			{ config: { relations: 'v2' } }
		)
	})
})

describe('dateMode', () => {
	test.each<Provider>(['postgres', 'mysql'])('%s string', async (provider) => {
		await expectSchemaToMatchSnapshots(
			schemaFor(provider),
			{ provider, fixture: 'config-date-mode-string' },
			{ config: { dateMode: 'string' } }
		)
	})

	test.each(providers)('%s date', async (provider) => {
		await expectSchemaToMatchSnapshots(
			schemaFor(provider),
			{ provider, fixture: 'config-date-mode-date' },
			{ config: { dateMode: 'date' } }
		)
	})
})

describe('moduleResolution', () => {
	const RELATIVE_IMPORT = /from '(\.\.?\/[^']*)'/g

	function relativeImports(files: Record<string, string>) {
		return Object.values(files).flatMap((code) =>
			[...code.matchAll(RELATIVE_IMPORT)].map((match) => match[1])
		)
	}

	describe.each(['node', 'bundler'])('%s', (moduleResolution) => {
		test.each(providers)('%s', async (provider) => {
			const location = {
				provider,
				fixture: `config-module-resolution-${moduleResolution}`,
			}
			const files = await generateFromSchema(schemaFor(provider), {
				config: { moduleResolution },
			})

			const imports = relativeImports(files)
			expect(imports.length).toBeGreaterThan(0)
			expect(imports.filter((module) => module.endsWith('.js'))).toEqual([])
			expectFilesToMatchSnapshots(files, location)
		})
	})

	describe.each(['nodenext', 'node16'])('%s', (moduleResolution) => {
		test.each(providers)('%s', async (provider) => {
			const location = {
				provider,
				fixture: `config-module-resolution-${moduleResolution}`,
			}
			const files = await generateFromSchema(schemaFor(provider), {
				config: { moduleResolution },
			})

			const imports = relativeImports(files)
			expect(imports.length).toBeGreaterThan(0)
			expect(imports.filter((module) => !module.endsWith('.js'))).toEqual([])
			expectFilesToMatchSnapshots(files, location)
		})
	})
})

describe('output', () => {
	test.each(providers)('%s single file', async (provider) => {
		await expectSchemaToMatchSnapshots(
			schemaFor(provider),
			{ provider, fixture: 'config-output-single-file' },
			{ singleFile: true }
		)
	})

	test.each(providers)('%s directory', async (provider) => {
		await expectSchemaToMatchSnapshots(schemaFor(provider), {
			provider,
			fixture: 'config-output-directory',
		})
	})
})
