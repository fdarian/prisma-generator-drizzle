import { DMMF } from '@prisma/generator-helper'
import { Adapter } from './adapter/types'
import { Config } from './config'

export type Context = {
  adapter: Adapter
  config: Config
  datamodel: DMMF.Datamodel
}
