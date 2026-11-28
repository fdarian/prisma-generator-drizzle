import { relations } from 'drizzle-orm';
import { users } from './users';
import { profiles } from './profiles';

export const usersRelations = relations(users, (helpers) => ({ profile: helpers.one(profiles) }));