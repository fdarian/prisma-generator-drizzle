import { relations } from 'drizzle-orm';
import { teams } from './teams';
import { memberships } from './memberships';

export const teamsRelations = relations(teams, (helpers) => ({ members: helpers.many(memberships, { relationName: 'MembershipToTeam' }) }));