import { schema } from 'prisma/drizzle/schema'
import { db } from 'src/lib/postgres'
import { testIgnoreDecorator } from './shared/testIgnoreDecorator'
import { testManyToMany } from './shared/testManyToMany'
import { testDefault } from './shared/testDefault'
import { testSelfReferring } from './shared/testSelfReferring'
import type { TestContext } from './utils/types'
import { testFields } from './shared/testFields'
import { testOneToMany } from './shared/testOneToMany'
import { testOneToOne } from './shared/testOneToOne'
import { testDisambiguatingRelationship } from './shared/testDisambiguatingRelationship'

const ctx: TestContext = { db, schema, provider: 'postgres' }

testFields(ctx)
testOneToOne(ctx)
testOneToMany(ctx)
testManyToMany(ctx)
testDisambiguatingRelationship(ctx)
testSelfReferring(ctx)
testIgnoreDecorator(ctx)
testDefault(ctx)
