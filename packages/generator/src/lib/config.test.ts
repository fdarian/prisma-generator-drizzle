import { describe, expect, it } from 'vitest'
import { ConfigError, parseConfig } from './config'

describe('parseConfig relations', () => {
	it('defaults to v1', () => {
		expect(parseConfig({}).relations).toBe('v1')
	})

	it('accepts v1', () => {
		expect(parseConfig({ relations: 'v1' }).relations).toBe('v1')
	})

	it('accepts v2', () => {
		expect(parseConfig({ relations: 'v2' }).relations).toBe('v2')
	})

	it('rejects other values naming the allowed ones', () => {
		expect(() => parseConfig({ relations: 'v3' })).toThrow(ConfigError)
		expect(() => parseConfig({ relations: 'v3' })).toThrow(
			'- relations: Invalid type: Expected "v1" | "v2" but received "v3"'
		)
	})
})
