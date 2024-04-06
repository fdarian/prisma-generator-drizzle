import { logger as baseLogger } from '@prisma/sdk'
import { GENERATOR_NAME } from 'src/constants'
import { getGeneratorContext } from '~/shared/generator-context'

function isVerbose() {
	return getGeneratorContext().config.verbose
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

export const logger = {
	log,
	createTask,
}
