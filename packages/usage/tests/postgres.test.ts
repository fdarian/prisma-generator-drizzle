import { createId } from '@paralleldrive/cuid2'
import { payments } from 'prisma/drizzle/payments'
import { schema } from 'prisma/drizzle/schema'
import { teams } from 'prisma/drizzle/teams'
import { transfers } from 'prisma/drizzle/transfers'
import { users } from 'prisma/drizzle/users'
import { db } from 'src/lib/postgres'
import {
  team,
  transfer_user1_to_user2_insert,
  transfer_user1_to_user3_insert,
  transfer_user2_to_user1_insert,
  user2_insert,
  user2_result,
  user3_insert,
  user_insert,
  user_result,
} from './dummy'
import { testIgnoreDecorator } from './shared/test-ignore-decorator'
import { testManyToMany } from './shared/test-implicit-relation'
import { testSelfReferring } from './shared/testSelfReferring'

beforeEach(async () => {
  await db.delete(payments)
  await db.delete(transfers)
  await db.delete(users)
  await db.delete(teams)
})

test('insert + select', async () => {
  await db.insert(users).values(user_insert)

  const result = await db.query.users.findFirst({
    where: (User, { eq }) => eq(User.id, user_insert.id),
  })
  expect(result).toStrictEqual(user_result)
})

test('insert + select (variant 2)', async () => {
  await db.insert(users).values(user2_insert)

  const result = await db.query.users.findFirst({
    where: (User, { eq }) => eq(User.id, user2_insert.id),
  })
  expect(result).toStrictEqual(user2_result)
})

test('relations', async () => {
  await db.insert(teams).values(team)
  await db.insert(users).values({ ...user_insert, teamId: team.id })
  await db.insert(users).values({ ...user2_insert, teamId: team.id })

  //  Team.users
  const teamWithUsers = await db.query.teams.findFirst({
    where: (Team, { eq }) => eq(Team.id, team.id),
    with: {
      users: {
        orderBy: (User, { asc }) => asc(User.createdAt),
        columns: {
          id: true,
        },
      },
    },
  })

  expect(teamWithUsers).toStrictEqual({
    ...team,
    users: [{ id: user_result.id }, { id: user2_result.id }],
  })

  // user.team
  const userWithTeam = await db.query.users.findFirst({
    where: (Team, { eq }) => eq(Team.id, user_result.id),
    with: { team: true },
  })
  expect(userWithTeam).toStrictEqual({
    ...user_result,
    teamId: team.id,
    team: team,
  })
})

test('disambiguating relations many', async () => {
  await db.insert(users).values(user_insert)
  await db.insert(users).values(user2_insert)
  await db.insert(users).values(user3_insert)
  await db.insert(transfers).values(transfer_user1_to_user2_insert)
  await db.insert(transfers).values(transfer_user2_to_user1_insert)
  await db.insert(transfers).values(transfer_user1_to_user3_insert)

  const transfer = await db.query.transfers.findFirst({
    where: (Transfer, { eq }) =>
      eq(Transfer.id, transfer_user1_to_user2_insert.id),
    with: { from: { columns: { id: true } }, to: { columns: { id: true } } },
  })
  if (!transfer) throw new Error('transfer is null')
  expect(transfer.from).toStrictEqual({ id: user_result.id })
  expect(transfer.to).toStrictEqual({ id: user2_result.id })

  async function fetchUser(userId: string) {
    const user = await db.query.users.findFirst({
      where: (User, { eq }) => eq(User.id, userId),
      with: {
        receivedTransfers: {
          orderBy: (Transfer, { asc }) => asc(Transfer.createdAt),
        },
        sentTransfers: {
          orderBy: (Transfer, { asc }) => asc(Transfer.createdAt),
        },
      },
    })
    if (!user) throw new Error('user is null')
    return user
  }

  const user1 = await fetchUser(user_insert.id)

  expect(user1.sentTransfers).toStrictEqual([
    transfer_user1_to_user2_insert,
    transfer_user1_to_user3_insert,
  ])
  expect(user1.receivedTransfers).toStrictEqual([
    transfer_user2_to_user1_insert,
  ])

  const user2 = await fetchUser(user2_insert.id)

  expect(user2.sentTransfers).toStrictEqual([transfer_user2_to_user1_insert])
  expect(user2.receivedTransfers).toStrictEqual([
    transfer_user1_to_user2_insert,
  ])

  const user3 = await fetchUser(user3_insert.id)

  expect(user3.sentTransfers).toStrictEqual([])
  expect(user3.receivedTransfers).toStrictEqual([
    transfer_user1_to_user3_insert,
  ])
})

test('disambiguating relations optional unique', async () => {
  const [t1, t2] = [
    transfer_user1_to_user2_insert,
    transfer_user2_to_user1_insert,
  ]
  await db.insert(users).values(user_insert)
  await db.insert(users).values(user2_insert)
  await db.insert(transfers).values(t1)
  await db.insert(transfers).values(t2)

  const payment = { id: createId(), paymentTransferId: t1.id }
  await db.insert(payments).values(payment)

  const tax = { id: createId(), taxTransferId: t2.id }
  await db.insert(payments).values(tax)
  // --

  const t1_result = await db.query.transfers.findFirst({
    where: (Transfer, { eq }) => eq(Transfer.id, t1.id),
    with: { payment: true },
  })
  expect(t1_result).toStrictEqual({
    ...t1,
    payment: {
      ...payment,
      taxTransferId: null,
    },
  })

  const t2_result = await db.query.transfers.findFirst({
    where: (Transfer, { eq }) => eq(Transfer.id, t2.id),
    with: { tax: true },
  })
  expect(t2_result).toStrictEqual({
    ...t2,
    tax: {
      ...tax,
      paymentTransferId: null,
    },
  })
})

testManyToMany(db, schema)
testSelfReferring(db, schema)
testIgnoreDecorator(db, schema)
