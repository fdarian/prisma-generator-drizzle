import { describe, expect, test } from 'bun:test'
import { ConfigError, parseConfig } from './config'

describe('parseConfig relations', () => {
	test('defaults to v1', () => {
		expect(parseConfig({}).relations).toBe('v1')
	})

	test('accepts v1', () => {
		expect(parseConfig({ relations: 'v1' }).relations).toBe('v1')
	})

	test('accepts v2', () => {
		expect(parseConfig({ relations: 'v2' }).relations).toBe('v2')
	})

	test('rejects other values naming the allowed ones', () => {
		expect(() => parseConfig({ relations: 'v3' })).toThrow(ConfigError)
		expect(() => parseConfig({ relations: 'v3' })).toThrow(
			'- relations: Invalid type: Expected ("v1" | "v2") but received "v3"'
		)
	})
})
