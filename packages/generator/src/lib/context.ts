import type { DMMF } from '@prisma/generator-helper'
import type { Adapter } from './adapter/types'
import type { Config } from './config'

export type Context = {
	adapter: Adapter
	config: Config
	datamodel: DMMF.Datamodel
}
