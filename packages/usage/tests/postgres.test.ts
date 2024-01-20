import { schema } from 'prisma/drizzle/schema'
import { db } from 'src/lib/postgres'
import { testIgnoreDecorator } from './shared/test-ignore-decorator'
import { testManyToMany } from './shared/test-implicit-relation'
import { testDefault } from './shared/testDefault'
import { testSelfReferring } from './shared/testSelfReferring'
import { TestContext } from './utils/types'
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
