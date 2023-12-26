import { teams } from 'prisma/drizzle/teams'
import { users } from 'prisma/drizzle/users'
import { db } from 'src/lib/postgres'
import {
  team,
  user2_insert,
  user2_result,
  user_insert,
  user_result,
} from './dummy'

beforeEach(async () => {
  await db.delete(users)
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
