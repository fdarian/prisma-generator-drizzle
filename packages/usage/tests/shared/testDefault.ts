import { createId } from '@paralleldrive/cuid2'
import { isAfter } from 'date-fns'
import { Db, Schema } from 'src/lib/types'
import { describe, test } from 'vitest'

export function testDefault(db: Db, schema: Schema) {
  describe('@default syntax', () => {
    test('datetime', async () => {
      const now = new Date()
      const data = { id: createId() }
      await db.insert(schema.defaults).values(data)

      const result = await db.query.defaults.findFirst({
        where: (defaults, { eq }) => eq(defaults.id, data.id),
      })

      expect(result).toBeDefined()
      expect(isAfter(result!.createdAt, now))
    })
  })
}
