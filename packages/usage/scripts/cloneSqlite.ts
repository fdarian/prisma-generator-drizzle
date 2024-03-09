export type {}

const BASE_PATH = './prisma/schema.prisma'
const TARGET_PATH = './prisma/sqlite/schema.prisma'

const schema = (await Bun.file(BASE_PATH).text())
	.replace('postgresql', 'sqlite')
	.replace('env("DATABASE_URL")', '"file:./test.db"')
	.replace(/(\/\/ start -sqlite\n)[\s\S]*?(\n\/\/ end -sqlite)/g, '')
	.replace(/^.*-sqlite.*/gm, '')

Bun.write(TARGET_PATH, schema)
