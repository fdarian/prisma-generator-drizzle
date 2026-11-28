import { generatorHandler } from '@prisma/generator-helper'
import { GENERATOR_NAME } from './constants'
import { generate } from './generate'

const { version } = require('../package.json')

generatorHandler({
	onManifest() {
		return {
			version,
			defaultOutput: './drizzle',
			prettyName: GENERATOR_NAME,
		}
	},
	onGenerate: generate,
})
