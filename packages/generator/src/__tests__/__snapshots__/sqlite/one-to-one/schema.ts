import * as users from './users';
import * as profiles from './profiles';
import * as usersRelations from './users-relations';
import * as profilesRelations from './profiles-relations';

export const schema = { ...users, ...profiles, ...usersRelations, ...profilesRelations };