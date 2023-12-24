import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from 'prisma/drizzle/schema'
import { users } from 'prisma/drizzle/users'
import { db } from 'src/lib/db'
import { object, parse, string, url } from 'valibot'

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
