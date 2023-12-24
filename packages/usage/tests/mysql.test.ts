import { users } from 'prisma/mysql/drizzle/users'
import { db } from 'src/lib/mysql'

beforeEach(async () => {
  await db.delete(users)
})

test('findFirst', async () => {
  const user = {
    id: 1,
    name: 'John',
    email: 'john@email.com',
  }
  await db.insert(users).values(user)

  expect(user).toStrictEqual(
    await db.query.users.findFirst({
      where: (User, { eq }) => eq(User.id, user.id),
    })
  )
})
