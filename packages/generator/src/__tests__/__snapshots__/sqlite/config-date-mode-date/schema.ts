import * as authors from './authors';
import * as posts from './posts';
import * as authorsRelations from './authors-relations';
import * as postsRelations from './posts-relations';

export const schema = { ...authors, ...posts, ...authorsRelations, ...postsRelations };