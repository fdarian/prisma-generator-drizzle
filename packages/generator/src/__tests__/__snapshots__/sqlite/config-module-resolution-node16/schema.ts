import * as authors from './authors.js';
import * as posts from './posts.js';
import * as authorsRelations from './authors-relations.js';
import * as postsRelations from './posts-relations.js';

export const schema = { ...authors, ...posts, ...authorsRelations, ...postsRelations };