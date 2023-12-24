import { execSync } from 'child_process'
import { object, parse, string, url } from 'valibot'

const env = parse(
  object({
    TEST_DATABASE_URL: string([url()]),
  }),
  process.env
)

execSync(
  `DATABASE_URL=${env.TEST_DATABASE_URL} bun prisma db push --force-reset --accept-data-loss`
)

try {
  execSync(`DATABASE_URL=${env.TEST_DATABASE_URL} bun test`, {
    stdio: 'inherit',
  })
} catch (err) {
  console.log((err as Error).message)
}

process.exit(0)
