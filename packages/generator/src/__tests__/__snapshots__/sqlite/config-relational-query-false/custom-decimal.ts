import { customType } from 'drizzle-orm/sqlite-core';

export const customDecimal = customType<{ data: string }>(
  {
    dataType() {
      return 'DECIMAL';
    },
    fromDriver(value: unknown) {
      return String(value)
    },
    toDriver(value: string) {
      return Number(value)
    },
  },
);