import { relations } from 'drizzle-orm';
import { members } from './members';
import { memberships } from './memberships';

export const membersRelations = relations(members, (helpers) => ({ teams: helpers.many(memberships, { relationName: 'MemberToMembership' }) }));