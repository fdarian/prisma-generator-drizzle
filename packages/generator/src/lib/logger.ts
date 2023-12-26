import { logger as baseLogger } from '@prisma/sdk'
import { GENERATOR_NAME } from 'src/constants'

function info(message: string) {
  baseLogger.info(`${GENERATOR_NAME} — ${message}`)
}

function createTask() {
  const timeStarted = Date.now()
  return {
    end(message: string) {
      return info(`${message} in ${Date.now() - timeStarted}ms`)
    },
  }
}

export const logger = {
  info,
  createTask,
}
