import { schema } from 'prisma/sqlite/drizzle/schema'
import { db } from 'src/lib/sqlite'
import { Db, Schema } from 'src/lib/types'
import { testIgnoreDecorator } from './shared/test-ignore-decorator'
import { testManyToMany } from './shared/test-implicit-relation'
import { testDefault } from './shared/testDefault'
import { testSelfReferring } from './shared/testSelfReferring'
import { TestContext } from './utils/types'
import { testFields } from './shared/testFields'
import { testOneToMany } from './shared/testOneToMany'
import { testOneToOne } from './shared/testOneToOne'
import { testDisambiguatingRelationship } from './shared/testDisambiguatingRelationship'

const _db = db as unknown as Db
const _schema = schema as unknown as Schema
const ctx: TestContext = { db: _db, schema: _schema, provider: 'sqlite' }

testFields(ctx)
testOneToOne(ctx)
testOneToMany(ctx)
testManyToMany(_db, _schema)
testDisambiguatingRelationship(ctx)
testSelfReferring(_db, _schema)
testIgnoreDecorator(_db, _schema)
testDefault(_db, _schema, 'sqlite')
