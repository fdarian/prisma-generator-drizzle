import { logger as baseLogger } from '@prisma/sdk'
import { GENERATOR_NAME } from 'src/constants'

function log(message: string) {
  baseLogger.log(`${GENERATOR_NAME}: ${message}`)
}

function createTask() {
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
