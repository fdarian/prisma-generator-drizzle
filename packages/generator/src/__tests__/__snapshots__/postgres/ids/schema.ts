import * as intIds from './int-ids';
import * as stringIds from './string-ids';
import * as bigIntIds from './big-int-ids';
import * as compositeIds from './composite-ids';
import * as compositeMappedIds from './composite-mapped-ids';

export const schema = { ...intIds, ...stringIds, ...bigIntIds, ...compositeIds, ...compositeMappedIds };