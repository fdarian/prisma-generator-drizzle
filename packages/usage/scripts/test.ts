import { execSync } from 'child_process'
import { object, parse, string, url } from 'valibot'

const env = parse(
  object({
    PG_DATABASE_URL: string([url()]),
    MYSQL_DATABASE_URL: string([url()]),
  }),
  process.env
)

const promises = [
  execSync(
    `DATABASE_URL=${env.PG_DATABASE_URL} bun prisma db push --schema prisma/schema.prisma --force-reset --accept-data-loss`
  ),
  execSync(
    `DATABASE_URL=${env.MYSQL_DATABASE_URL} bun prisma db push --schema prisma/mysql/schema.prisma --force-reset --accept-data-loss`
  ),
]

await Promise.all(promises)

execSync(`DATABASE_URL=${env.PG_DATABASE_URL} bun test`, {
  stdio: 'inherit',
})

process.exit(0)
