import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import { createTempHandler } from './utils/temp'

const tempHandler = createTempHandler()

afterAll(async () => {
	await tempHandler.cleanup()
})

async function generate(relationMode: string | undefined) {
	const temp = await tempHandler.prepare()

	fs.writeFileSync(
		`${temp.basePath}/schema.prisma`,
		`datasource db {
			provider = "postgresql"
			${relationMode == null ? '' : `relationMode = "${relationMode}"`}
		}

		generator drizzle {
			provider = "prisma-generator-drizzle"
			output = "drizzle.ts"
		}

		model Author {
			id Int @id
			posts Post[]
			reviews Post[] @relation("reviewer")
			tags Tag[]
		}

		model Post {
			id Int @id
			authorId Int
			author Author @relation(fields: [authorId], references: [id])
			reviewerId Int?
			reviewer Author? @relation("reviewer", fields: [reviewerId], references: [id], map: "post_reviewer")
		}

		model Region {
			country String
			code String
			offices Office[]

			@@id([country, code])
		}

		model Office {
			id Int @id
			country String
			code String
			region Region @relation(fields: [country, code], references: [country, code])
		}

		model Tag {
			id Int @id
			authors Author[]
		}`
	)
	execSync(`pnpm exec prisma generate --schema ${temp.basePath}/schema.prisma`)

	return fs.readFileSync(`${temp.basePath}/drizzle.ts`, 'utf-8')
}

test('the same schema emits foreign keys without relationMode', async () => {
	const output = await generate(undefined)
	expect(output).toContain("pgTable('Post'")
	expect(output).toContain('.references(')
	expect(output).toContain('foreignKey(')
})

test('relationMode = "prisma" emits no foreign keys', async () => {
	const output = await generate('prisma')
	expect(output).toContain("pgTable('Post'")
	expect(output).not.toContain('.references(')
	expect(output).not.toContain('foreignKey(')
})
