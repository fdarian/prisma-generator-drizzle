import * as teams from './teams';
import * as members from './members';
import * as memberships from './memberships';
import * as teamsRelations from './teams-relations';
import * as membersRelations from './members-relations';
import * as membershipsRelations from './memberships-relations';

export const schema = { ...teams, ...members, ...memberships, ...teamsRelations, ...membersRelations, ...membershipsRelations };