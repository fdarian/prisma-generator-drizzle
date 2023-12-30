import { execSync } from 'child_process'
import { object, parse, string, url } from 'valibot'

const env = parse(
  object({
    PG_DATABASE_URL: string([url()]),
    MYSQL_DATABASE_URL: string([url()]),
  }),
  process.env
)

const schema = await Bun.file('./prisma/schema.prisma').text()
Bun.write('./prisma/mysql/schema.prisma', schema.replace('postgresql', 'mysql'))

Bun.write(
  './prisma/sqlite/schema.prisma',
  schema
    .replace('postgresql', 'sqlite')
    .replace('env("DATABASE_URL")', '"file:./test.db"')
    .replace('  json              Json?', '')
    .replace('  bigint            BigInt?', '')
    .replace('  enum              UserType', '')
    .replace(/enum UserType \{\s*TypeOne\s*TypeTwo\s*\}/g, '')
)

const promises = [
  execSync(
    `DATABASE_URL=${env.PG_DATABASE_URL} bun prisma db push --schema prisma/schema.prisma --force-reset --accept-data-loss`,
    { stdio: 'inherit' }
  ),
  execSync(
    `DATABASE_URL=${env.MYSQL_DATABASE_URL} bun prisma db push --schema prisma/mysql/schema.prisma --force-reset --accept-data-loss`,
    { stdio: 'inherit' }
  ),
  execSync(
    `bun prisma db push --schema prisma/sqlite/schema.prisma --force-reset --accept-data-loss`,
    { stdio: 'inherit' }
  ),
]

await Promise.all(promises)

try {
  execSync('bun test', { stdio: 'inherit' })
} catch (err) {
  process.exit(1)
}

process.exit(0)
