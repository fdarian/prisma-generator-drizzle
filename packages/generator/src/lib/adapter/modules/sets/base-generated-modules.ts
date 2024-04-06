import type { Module } from '~/lib/syntaxes/module'
import type { ModelModule } from '../model'

export type BaseGeneratedModules = {
	extras?: Module[]
	enums: Module[]
	models: ModelModule[]
}
