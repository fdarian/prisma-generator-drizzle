import { test } from 'bun:test'
import { datasource, expectSchemaToMatchSnapshots } from '../harness'

const models = `
enum Tag {
  A
  B @map("b")
}

model Lists {
  id         Int        @id
  strings    String[]
  ints       Int[]
  bigInts    BigInt[]
  floats     Float[]
  decimals   Decimal[]
  booleans   Boolean[]
  dateTimes  DateTime[]
  jsons      Json[]
  bytes      Bytes[]
  tags       Tag[]
  emptyStrings String[] @default([])
  defaultInts  Int[]    @default([1, 2, 3])
  defaultStrings String[] @default(["a", "b"])
  defaultBools Boolean[] @default([true, false])
  defaultTags  Tag[]    @default([A, B])
  defaultBigInts BigInt[] @default([1, 2])
  defaultFloats Float[]  @default([1.5, 2])
  defaultDecimals Decimal[] @default([1.5, 2])
  defaultDateTimes DateTime[] @default(["2024-01-02T03:04:05.000Z"])
  defaultBytes Bytes[]   @default(["aGVsbG8="])
}
`

test('lists (postgres)', async () => {
	await expectSchemaToMatchSnapshots(datasource('postgres') + models, {
		provider: 'postgres',
		fixture: 'lists',
	})
})
