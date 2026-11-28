import { expect } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { GeneratorOptions } from '@prisma/generator-helper'
import { getConfig, getDMMF } from '@prisma/internals'
import { generate } from '~/generate'

export type GenerateOptions = {
	/** Emit a single `schema.ts` instead of one file per module */
	singleFile?: boolean
	/** Generator config keys exactly as written in `schema.prisma` */
	config?: Record<string, string>
	/** Rewrites the options built from the schema, for states Prisma itself would not produce */
	overrideOptions?: (options: GeneratorOptions) => GeneratorOptions
}

export type GeneratedFiles = Record<string, string>

// Pinned so the output doesn't depend on the tsconfig found from cwd
const DEFAULT_CONFIG = { moduleResolution: 'node' }

export async function generateFromSchema(
	schema: string,
	options: GenerateOptions = {}
): Promise<GeneratedFiles> {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drizzle-generator-'))
	try {
		const outputPath = options.singleFile
			? path.join(tempDir, 'schema.ts')
			: path.join(tempDir, 'out')

		const prismaConfig = await getConfig({ datamodel: schema })
		const generatorOptions: GeneratorOptions = {
			generator: {
				name: 'drizzle',
				provider: { fromEnvVar: null, value: 'prisma-generator-drizzle' },
				output: { fromEnvVar: null, value: outputPath },
				config: { ...DEFAULT_CONFIG, ...options.config },
				binaryTargets: [],
				previewFeatures: [],
				sourceFilePath: 'schema.prisma',
			},
			otherGenerators: [],
			schemaPath: 'schema.prisma',
			dmmf: await getDMMF({ datamodel: schema }),
			datasources: prismaConfig.datasources,
			datamodel: schema,
			version: 'test',
		}

		await generate(
			options.overrideOptions?.(generatorOptions) ?? generatorOptions
		)

		return readFiles(outputPath)
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true })
	}
}

function readFiles(outputPath: string): GeneratedFiles {
	if (outputPath.endsWith('.ts')) {
		return { [path.basename(outputPath)]: fs.readFileSync(outputPath, 'utf-8') }
	}
	return readDirectory(outputPath)
}

function readDirectory(directory: string): GeneratedFiles {
	const files: GeneratedFiles = {}
	for (const entry of fs.readdirSync(directory, {
		recursive: true,
		withFileTypes: true,
	})) {
		if (!entry.isFile()) continue
		const absolute = path.join(entry.parentPath, entry.name)
		files[path.relative(directory, absolute)] = fs.readFileSync(
			absolute,
			'utf-8'
		)
	}
	return files
}

const SNAPSHOT_ROOT = path.join(__dirname, '__snapshots__')
const UPDATE_COMMAND = 'UPDATE_SNAPSHOTS=1 bun test'
const claimedFixtures = new Set<string>()

/**
 * Compares the emitted files with `__snapshots__/<provider>/<fixture>/`.
 * `UPDATE_SNAPSHOTS=1` rewrites that directory instead, dropping files the
 * generator no longer emits.
 */
export function expectFilesToMatchSnapshots(
	files: GeneratedFiles,
	location: { provider: string; fixture: string }
) {
	const directory = path.join(
		SNAPSHOT_ROOT,
		location.provider,
		location.fixture
	)
	if (claimedFixtures.has(directory)) {
		throw new Error(
			`Snapshot fixture ${location.provider}/${location.fixture} is used by more than one test`
		)
	}
	claimedFixtures.add(directory)

	const names = Object.keys(files).sort()
	if (names.length === 0) {
		throw new Error(
			`Generation produced no files for ${location.provider}/${location.fixture}`
		)
	}

	if (process.env.UPDATE_SNAPSHOTS === '1') {
		fs.rmSync(directory, { recursive: true, force: true })
		for (const name of names) {
			const target = path.join(directory, name)
			fs.mkdirSync(path.dirname(target), { recursive: true })
			fs.writeFileSync(target, files[name])
		}
		return
	}

	const hint = `\nSnapshots for ${location.provider}/${location.fixture} are out of date. If the change is intended, run \`${UPDATE_COMMAND}\` in packages/generator and review the diff.`
	if (!fs.existsSync(directory)) {
		throw new Error(
			`No snapshots recorded for ${location.provider}/${location.fixture}.${hint}`
		)
	}

	const recorded = readDirectory(directory)
	try {
		expect(Object.keys(recorded).sort()).toEqual(names)
		for (const name of names) {
			expect(files[name]).toBe(recorded[name])
		}
	} catch (error) {
		if (error instanceof Error) error.message += hint
		throw error
	}
}

export type Provider = 'postgres' | 'mysql' | 'sqlite'

const PRISMA_PROVIDER: Record<Provider, string> = {
	postgres: 'postgresql',
	mysql: 'mysql',
	sqlite: 'sqlite',
}

/** `extra` lines are added inside the block, e.g. `schemas = ["a", "b"]` */
export function datasource(provider: Provider, extra: string[] = []) {
	return `datasource db {
  provider = "${PRISMA_PROVIDER[provider]}"
${extra.map((line) => `  ${line}\n`).join('')}}
`
}

export async function expectSchemaToMatchSnapshots(
	schema: string,
	location: { provider: Provider; fixture: string },
	options?: GenerateOptions
) {
	expectFilesToMatchSnapshots(
		await generateFromSchema(schema, options),
		location
	)
}
