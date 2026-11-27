import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	resolve: {
		alias: [
			{
				// The `prisma` package (v7) has an exports map, so these would no longer fall back to the local ./prisma directory
				find: /^prisma\/(drizzle|mysql|sqlite)\//,
				replacement: `${fileURLToPath(new URL('./prisma', import.meta.url))}/$1/`,
			},
		],
	},
	test: {
		globals: true,
		typecheck: {
			enabled: true,
		},
	},
})
