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
    datetime: new Date(),
    decimal: '0.123',
    enum: 'TypeOne',
    float: 0.123,
    json: { key: 'value' },
  }
  await db.insert(users).values(user)

  expect(user).toStrictEqual(
    await db.query.users.findFirst({
      where: (User, { eq }) => eq(User.id, user.id),
    })
  )
})
