import { schema } from 'prisma/sqlite/drizzle/schema'
import { db } from 'src/lib/sqlite'
import type { PostgresDb, PostgresSchema } from 'src/lib/types'
import { testDefault } from './shared/testDefault'
import { testDisambiguatingRelationship } from './shared/testDisambiguatingRelationship'
import { testEnumMap } from './shared/testEnumMap'
import { testFieldCustomization } from './shared/testFieldCustomization'
import { testFieldMap } from './shared/testFieldMap'
import { testFields } from './shared/testFields'
import { testForeignKeys } from './shared/testForeignKeys'
import { testIgnoreDecorator } from './shared/testIgnoreDecorator'
import { testManyToMany } from './shared/testManyToMany'
import { testOneToMany } from './shared/testOneToMany'
import { testOneToOne } from './shared/testOneToOne'
import { testSelfReferring } from './shared/testSelfReferring'
import { testUniqueConstraint } from './shared/testUniqueConstraint'
import { testUpdatedAt } from './shared/testUpdatedAt'
import type { TestContext } from './utils/types'

// Shared runtime tests are typed against postgres; see TestContext
const ctx: TestContext = {
	db: db as unknown as PostgresDb,
	schema: schema as unknown as PostgresSchema,
	provider: 'sqlite',
}

testFields(ctx)
testOneToOne(ctx)
testOneToMany(ctx)
testManyToMany(ctx)
testDisambiguatingRelationship(ctx)
testSelfReferring(ctx)
testIgnoreDecorator(ctx)
testDefault(ctx)
testFieldCustomization(ctx)
testFieldMap(ctx)
testEnumMap(ctx)
testUpdatedAt(ctx)
testForeignKeys(ctx)
testUniqueConstraint(ctx)
