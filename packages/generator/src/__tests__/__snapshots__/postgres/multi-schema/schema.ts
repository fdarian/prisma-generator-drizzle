import * as sessions from './sessions';
import * as audits from './audits';
import * as plains from './plains';

export const schema = { ...sessions, ...audits, ...plains };