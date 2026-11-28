import fs from 'node:fs/promises'
import { createId } from '@paralleldrive/cuid2'

export type TempDirectory = { name: string; basePath: string }

export function createTempHandler() {
	const temps: string[] = []
	return {
		async prepare(): Promise<TempDirectory> {
			const name = createId()
			await fs.mkdir(`.temp/${name}`, { recursive: true })
			temps.push(name)

			return {
				name,
				get basePath() {
					return `.temp/${name}`
				},
			}
		},
		async cleanup() {
			await Promise.all(
				temps.map((name) =>
					fs.rm(`.temp/${name}`, { recursive: true, force: true })
				)
			)
		},
	}
}
