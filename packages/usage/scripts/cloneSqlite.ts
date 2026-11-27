import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const BASE_PATH = './prisma/schema.prisma'
const TARGET_PATH = './prisma/sqlite/schema.prisma'

const schema = (await readFile(BASE_PATH, 'utf-8'))
	.replace('postgresql', 'sqlite')
	.replace(/(\/\/ start -sqlite\n)[\s\S]*?(\n\/\/ end -sqlite)/g, '')
	.replace(/^.*-sqlite.*/gm, '')

await mkdir(dirname(TARGET_PATH), { recursive: true })
await writeFile(TARGET_PATH, schema)
