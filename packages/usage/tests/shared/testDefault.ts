import { createId, isCuid } from '@paralleldrive/cuid2'
import { isAfter } from 'date-fns'
import { eq } from 'drizzle-orm'
import { Db, Schema } from 'src/lib/types'
import { describe, expect, test } from 'vitest'

export function testDefault(db: Db, schema: Schema) {
  describe('@default syntax', () => {
    test('@default', async () => {
      const data = { id: createId() }
      const now = new Date()
      await db.insert(schema.defaults).values(data)

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
      })
      // --

      expect(result).toBeDefined()
      expect(isAfter(result!.createdAt, now), 'Invalid now()').toBe(true)
      expect(result!.int, 'Invalid int').toBe(1)
      expect(result!.boolean, 'Invalid boolean').toBe(true)
      expect(result!.boolean, 'Invalid string').toBe('John')
      expect(result!.bigint, 'Invalid bigint').toBe(1n)
      expect(result!.decimal, 'Invalid decimal').toBe(
        '1.123000000000000000000000000000'
      )
      expect(result!.enum, 'Invalid enum').toBe('TypeTwo')
      expect(result!.float, 'Invalid float').toBe(1.123)
      expect(result!.json, 'Invalid json').toStrictEqual({ foo: 'bar' })

      // --
      await db.delete(schema.defaults).where(eq(schema.defaults.id, data.id))
    })

    test.only('custom drizzle.default', async () => {
      const data = { id: createId() }
      await db.insert(schema.defaults).values(data)
      // --

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
        columns: { alsoId: true, salt: true },
      })

      expect(result).toBeDefined()
      expect(isCuid(result!.alsoId), 'Invalid when without custom code').toBe(
        true
      )
      expect(result!.salt.length === 32, 'Invalid when with custom code').toBe(
        true
      )

      // --
      await db.delete(schema.defaults).where(eq(schema.defaults.id, data.id))
    })
  })
}
