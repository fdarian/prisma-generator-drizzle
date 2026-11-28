import { describe, expect, it } from 'vitest'
import { getImportedTypeNames } from './type-expression'

describe('getImportedTypeNames', () => {
	it.each([
		['Item', ['Item']],
		['Item[]', ['Item']],
		['Array<Item>', ['Item']],
		["Item['key']", ['Item']],
		['Record<string, Item>', ['Item']],
		['Map<Key, Value>', ['Key', 'Value']],
		['string[]', []],
		['Partial<Record<string, number>>', []],
		['Item | Item[] | Other', ['Item', 'Other']],
		['ns.Type', ['ns']],
		['ns.Inner.Type', ['ns']],
		["Settings['some Other']", ['Settings']],
		['Settings["Quoted"]', ['Settings']],
		['Settings[`Tpl`]', ['Settings']],
		['keyof typeof Config', ['Config']],
		['readonly Item[]', ['Item']],
		['Promise<Awaited<Item>>', ['Item']],
		['$Type_1', ['$Type_1']],
	])('%s', (expression, names) => {
		expect(getImportedTypeNames(expression)).toEqual(names)
	})
})
