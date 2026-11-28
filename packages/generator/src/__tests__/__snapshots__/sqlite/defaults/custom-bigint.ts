import { customType } from 'drizzle-orm/sqlite-core';

export const customBigInt = customType<{ data: bigint }>(
  {
    dataType() {
      return 'INTEGER';
    },
    fromDriver(value: unknown): bigint {
      if (typeof value !== 'number') {
        throw new Error('Expected number type for INTEGER')
      }
      return BigInt(value);
    },
    toDriver(value: bigint): number {
      return Number(value);
    }
  },
);