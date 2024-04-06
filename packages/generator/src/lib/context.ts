import type { DMMF } from '@prisma/generator-helper'
import type { Adapter } from './adapter/types'

export type Context = {
	adapter: Adapter
	datamodel: DMMF.Datamodel
}
