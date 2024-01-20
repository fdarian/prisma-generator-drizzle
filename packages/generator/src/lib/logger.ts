import { GeneratorOptions } from '@prisma/generator-helper'
import { logger as baseLogger } from '@prisma/sdk'
import { GENERATOR_NAME } from 'src/constants'

let isVerbose = false
function applyConfig(value: GeneratorOptions) {
	isVerbose = value.generator.config?.verbose === 'true'
}

function log(message: string) {
	if (!isVerbose) return

	baseLogger.log(`${GENERATOR_NAME}: ${message}`)
}

function createTask() {
	if (!isVerbose) return { end: (_: string) => undefined }

	const timeStarted = Date.now()
	return {
		end(message: string) {
			return log(`${message} in ${Date.now() - timeStarted}ms`)
		},
	}
}

export const logger = {
	applyConfig,
	log,
	createTask,
}
