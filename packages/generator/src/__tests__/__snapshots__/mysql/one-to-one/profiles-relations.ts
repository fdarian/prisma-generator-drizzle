import { relations } from 'drizzle-orm';
import { profiles } from './profiles';
import { users } from './users';

export const profilesRelations = relations(profiles, (helpers) => ({ user: helpers.one(users, { relationName: 'ProfileToUser', fields: [ profiles.userId ], references: [ users.id ] }) }));