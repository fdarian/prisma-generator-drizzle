import fs from 'node:fs/promises'
import { createId } from '@paralleldrive/cuid2'

export function createTempHandler() {
	const temps: string[] = []
	return {
		async prepare() {
			const name = createId()
			await fs.mkdir(`.temp/${name}`, { recursive: true })
			return { name }
		},
		async cleanup() {
			await Promise.all(
				temps.map((name) => fs.rmdir(`.temp/${name}`, { recursive: true }))
			)
		},
	}
}
