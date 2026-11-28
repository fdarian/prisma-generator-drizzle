import * as people from './people';
import * as articles from './articles';
import * as peopleRelations from './people-relations';
import * as articlesRelations from './articles-relations';

export const schema = { ...people, ...articles, ...peopleRelations, ...articlesRelations };