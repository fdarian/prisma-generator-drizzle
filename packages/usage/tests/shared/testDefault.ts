import { createId } from '@paralleldrive/cuid2'
import { isAfter } from 'date-fns'
import { eq } from 'drizzle-orm'
import { Db, Schema } from 'src/lib/types'
import { describe, test } from 'vitest'

export function testDefault(db: Db, schema: Schema) {
  describe('@default syntax', () => {
    let data = { id: createId() }
    beforeEach(() => {
      data = { id: createId() }
    })

    afterEach(async () => {
      await db.delete(schema.defaults).where(eq(schema.defaults.id, data.id))
    })

    test('datetime', async () => {
      const now = new Date()
      await db.insert(schema.defaults).values(data)

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
      })

      expect(result).toBeDefined()
      expect(isAfter(result!.createdAt, now))
    })

    test('int', async () => {
      await db.insert(schema.defaults).values(data)

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
      })

      expect(result).toBeDefined()
      expect(result!.int).toBe(1)
    })

    test('boolean', async () => {
      await db.insert(schema.defaults).values(data)

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
      })

      expect(result).toBeDefined()
      expect(result!.boolean).toBe(true)
    })

    test('string', async () => {
      await db.insert(schema.defaults).values(data)

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
      })

      expect(result).toBeDefined()
      expect(result!.string).toBe('John')
    })

    test('bigint', async () => {
      await db.insert(schema.defaults).values(data)

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
      })

      expect(result).toBeDefined()
      expect(result!.bigint).toBe(1n)
    })

    test('decimal', async () => {
      await db.insert(schema.defaults).values(data)

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
      })

      expect(result).toBeDefined()
      expect(result!.decimal).toBe('1.123000000000000000000000000000')
    })

    test('enum', async () => {
      await db.insert(schema.defaults).values(data)

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
      })

      expect(result).toBeDefined()
      expect(result!.enum).toBe('TypeTwo')
    })

    test('float', async () => {
      await db.insert(schema.defaults).values(data)

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
      })

      expect(result).toBeDefined()
      expect(result!.float).toBe(1.123)
    })

    test('json', async () => {
      await db.insert(schema.defaults).values(data)

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
      })

      expect(result).toBeDefined()
      expect(result!.json).toStrictEqual({ foo: 'bar' })
    })
  })
}
