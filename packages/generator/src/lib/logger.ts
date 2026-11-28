import { logger as baseLogger } from '@prisma/sdk'
import { GENERATOR_NAME } from '~/constants'
import { getGenerator } from '~/shared/generator-context'

function isVerbose() {
	return getGenerator().config.verbose
}

function log(message: string) {
	if (!isVerbose()) return

	baseLogger.log(`${GENERATOR_NAME}: ${message}`)
}

function createTask() {
	if (!isVerbose()) return { end: (_: string) => undefined }

	const timeStarted = Date.now()
	return {
		end(message: string) {
			return log(`${message} in ${Date.now() - timeStarted}ms`)
		},
	}
}

function warn(message: string) {
	// Prisma 7's CLI reads the generator's stderr as JSON-RPC and drops other lines; stdout is inherited.
	console.log(`${GENERATOR_NAME}: warning: ${message}`)
}

export const logger = {
	log,
	warn,
	createTask,
}
