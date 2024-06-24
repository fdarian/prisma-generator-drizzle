import { db } from '@/infra/db'
import { users } from '../../prisma/drizzle'

export default async function Home() {
	const result = await db.$drizzle.select().from(users)

	return (
		<main className="grid place-items-center w-screen h-screen">
			<div>
				<p>Users</p>
				{result.map((user) => (
					<p key={user.id}>{user.name}</p>
				))}
			</div>
		</main>
	)
}
