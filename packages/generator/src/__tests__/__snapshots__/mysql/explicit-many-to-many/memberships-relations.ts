import { relations } from 'drizzle-orm';
import { memberships } from './memberships';
import { teams } from './teams';
import { members } from './members';

export const membershipsRelations = relations(memberships, (helpers) => ({ team: helpers.one(teams, { relationName: 'MembershipToTeam', fields: [ memberships.teamId ], references: [ teams.id ] }), member: helpers.one(members, { relationName: 'MemberToMembership', fields: [ memberships.memberId ], references: [ members.id ] }) }));