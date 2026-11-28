import { describe, expect, test } from 'bun:test'
import { parseTypeExpression } from './type-expression'

describe('parseTypeExpression', () => {
	test.each([
		['Item', ['Item']],
		['Item[]', ['Item']],
		['Item[][]', ['Item']],
		['Array<Item>', ['Item']],
		["Item['key']", ['Item']],
		['Item["key"]', ['Item']],
		['Record<string, Item>', ['Item']],
		['Map<Key, Value>', ['Key', 'Value']],
		['ns.Type', ['ns']],
		['ns.Inner.Type', ['ns']],
		['Item | Other', ['Item', 'Other']],
		['Item & Other', ['Item', 'Other']],
		['Item | Item[] | Other', ['Item', 'Other']],
		['(Item | Other)[]', ['Item', 'Other']],
		['Record<PropertyKey, Item>', ['Item']],
		['Partial<Record<string, number>>', []],
		['string[]', []],
		["'a' | 'b'", []],
		['1 | 2', []],
		['Ítem', ['Ítem']],
		['$Type_1', ['$Type_1']],
		['Map', ['Map']],
		['Date', ['Date']],
		['  Item  [ ]  ', ['Item']],
	])('imports for %s', (expression, names) => {
		expect(parseTypeExpression(expression)).toEqual({ supported: true, names })
	})

	test.each([
		'{ items: Item[] }',
		'(x: Item) => void',
		'[Head, ...Rest[]]',
		'`item-${Id}`',
		'{ [K in Keys]: Item }',
		'keyof Config',
		'Item extends Other ? A : B',
		'Item[',
		'Item<',
		'string<Item>',
		'Item |',
		'',
	])('does not support %s', (expression) => {
		expect(parseTypeExpression(expression)).toEqual({ supported: false })
	})
})
