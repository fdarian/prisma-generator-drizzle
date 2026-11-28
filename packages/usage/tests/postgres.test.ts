import { schema } from 'prisma/drizzle/schema'
import { db } from 'src/lib/postgres'
import { testDefault } from './shared/testDefault'
import { testDisambiguatingRelationship } from './shared/testDisambiguatingRelationship'
import { testEnumMap } from './shared/testEnumMap'
import { testFieldCustomization } from './shared/testFieldCustomization'
import { testFieldMap } from './shared/testFieldMap'
import { testFields } from './shared/testFields'
import { testForeignKeys } from './shared/testForeignKeys'
import { testIgnoreDecorator } from './shared/testIgnoreDecorator'
import { testIndexes } from './shared/testIndexes'
import { testManyToMany } from './shared/testManyToMany'
import { testNativeTypes } from './shared/testNativeTypes'
import { testOneToMany } from './shared/testOneToMany'
import { testOneToOne } from './shared/testOneToOne'
import { testSelfReferring } from './shared/testSelfReferring'
import { testUpdatedAt } from './shared/testUpdatedAt'
import type { TestContext } from './utils/types'

const ctx: TestContext = { db, schema, provider: 'postgres' }

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
testNativeTypes(ctx)
testForeignKeys(ctx)
testIndexes(ctx)
