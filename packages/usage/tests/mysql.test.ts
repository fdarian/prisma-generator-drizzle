import { users } from 'prisma/mysql/drizzle/users'
import { db } from 'src/lib/mysql'

beforeEach(async () => {
  await db.delete(users)
})

test('findFirst', async () => {
  const user: typeof users.$inferInsert = {
    id: 1,
    name: 'John',
    email: 'john@email.com',
    bigint: 123n,
    boolean: true,
    // precision 3
    datetime: new Date('2020-01-23T12:01:30Z'),
    // 65, 30 precision
    decimal: '0.123000000000000000000000000000',
    enum: 'TypeOne',
    float: 0.123,
    json: { key: 'value' },
  }

  const query = db.insert(users).values(user)
  try {
    await query.execute()
  } catch (err) {
    console.log('error when executing this SQL:')
    console.log(query.toSQL())
    throw err
  }

  expect(user).toStrictEqual(
    await db.query.users.findFirst({
      where: (User, { eq }) => eq(User.id, user.id),
    })
  )
})
