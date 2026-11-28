import type { Module } from '~/lib/syntaxes/module'
import type { EnumModule } from '../enums'
import type { ModelModule } from '../model'

export type BaseGeneratedModules = {
	extras?: Module[]
	enums: EnumModule[]
	models: ModelModule[]
}
