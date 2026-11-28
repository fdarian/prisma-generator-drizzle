import { describe, test } from 'bun:test'
import {
	type Provider,
	datasource,
	expectSchemaToMatchSnapshots,
} from '../harness'

const providers: Provider[] = ['postgres', 'mysql', 'sqlite']

const oneToOne = `
model User {
  id      Int      @id
  profile Profile?
}

model Profile {
  id     Int  @id
  userId Int  @unique
  user   User @relation(fields: [userId], references: [id])
}
`

const oneToMany = `
model Author {
  id    Int    @id
  posts Post[]
}

model Post {
  id       Int    @id
  authorId Int
  author   Author @relation(fields: [authorId], references: [id], onDelete: Cascade, onUpdate: Restrict)
}
`

const selfRelations = `
model Employee {
  id        Int        @id
  managerId Int?
  manager   Employee?  @relation("Management", fields: [managerId], references: [id])
  reports   Employee[] @relation("Management")

  mentorId  Int?       @unique
  mentor    Employee?  @relation("Mentoring", fields: [mentorId], references: [id])
  mentee    Employee?  @relation("Mentoring")
}
`

const disambiguated = `
model Person {
  id            Int       @id
  writtenPosts  Article[] @relation("Author")
  editedPosts   Article[] @relation("Editor")
}

model Article {
  id       Int     @id
  authorId Int
  author   Person  @relation("Author", fields: [authorId], references: [id])
  editorId Int?
  editor   Person? @relation("Editor", fields: [editorId], references: [id])
}
`

const implicitManyToMany = `
model Post {
  id         Int        @id
  categories Category[]
}

model Category {
  id    Int    @id
  posts Post[]
}
`

const implicitNamedManyToMany = `
model Book {
  id      Int      @id
  authors Writer[] @relation("BookWriters")
}

model Writer {
  id    Int    @id
  books Book[] @relation("BookWriters")
}
`

const implicitMappedManyToMany = `
model Article {
  id   Int   @id
  tags Tag[]

  @@map("z_articles")
}

model Tag {
  id       Int       @id
  articles Article[]

  @@map("a_tags")
}
`

// Prisma rejects `references` on implicit m-n, so the join table always keys on the `@id`,
// whatever it is called, with a `@unique` field alongside as a distractor
const implicitCustomIdManyToMany = `
model Student {
  studentCode String   @id
  email       String   @unique
  courses     Course[]
}

model Course {
  courseId Int       @id
  slug     String    @unique
  students Student[]
}
`

const explicitManyToMany = `
model Team {
  id      Int          @id
  members Membership[]
}

model Member {
  id    Int          @id
  teams Membership[]
}

model Membership {
  teamId   Int
  memberId Int
  role     String
  team     Team   @relation(fields: [teamId], references: [id])
  member   Member @relation(fields: [memberId], references: [id])

  @@id([teamId, memberId])
}
`

const fixtures: Record<string, string> = {
	'one-to-one': oneToOne,
	'one-to-many': oneToMany,
	'self-relations': selfRelations,
	'disambiguated-relations': disambiguated,
	'implicit-many-to-many': implicitManyToMany,
	'implicit-named-many-to-many': implicitNamedManyToMany,
	'implicit-mapped-many-to-many': implicitMappedManyToMany,
	'implicit-custom-id-many-to-many': implicitCustomIdManyToMany,
	'explicit-many-to-many': explicitManyToMany,
}

describe.each(Object.entries(fixtures))('%s', (fixture, models) => {
	test.each(providers)('%s', async (provider) => {
		await expectSchemaToMatchSnapshots(datasource(provider) + models, {
			provider,
			fixture,
		})
	})
})
