import type { DMMF } from '@prisma/generator-helper'
import { createSchemaField } from '~/lib/prisma-helpers/schema/schema-field'
import { createSchemaModel } from '~/lib/prisma-helpers/schema/schema-model'

export function createMappedField(
	overrides: Pick<DMMF.Field, 'kind' | 'type'> & Partial<DMMF.Field>
) {
	const dmmfField: DMMF.Field = {
		name: 'successorId',
		dbName: 'successor_id',
		isRequired: true,
		isList: false,
		isId: false,
		isUnique: false,
		isReadOnly: false,
		hasDefaultValue: false,
		isGenerated: false,
		isUpdatedAt: false,
		...overrides,
	}
	const dmmfModel: DMMF.Model = {
		name: 'MappedField',
		dbName: null,
		schema: null,
		fields: [dmmfField],
		uniqueFields: [],
		uniqueIndexes: [],
		primaryKey: null,
	}
	return createSchemaField({
		model: createSchemaModel({ dmmfModel }),
		dmmfField,
	})
}
