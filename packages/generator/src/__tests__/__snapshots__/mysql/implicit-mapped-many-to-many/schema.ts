import * as articles from './articles';
import * as tags from './tags';
import * as articlesRelations from './articles-relations';
import * as tagsRelations from './tags-relations';
import * as articlesToTags from './articles-to-tags';
import * as articlesToTagsRelations from './articles-to-tags-relations';

export const schema = { ...articles, ...tags, ...articlesRelations, ...tagsRelations, ...articlesToTags, ...articlesToTagsRelations };