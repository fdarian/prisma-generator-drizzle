import { camelCase } from 'lodash'
import { ModelModule } from '../../../generator'
import { createDef } from '../../definitions/createDef'
import { constDeclaration } from '../../definitions/types/constDeclaration'
import { wildcardImport } from '../../definitions/types/imports'
import { object } from '../../definitions/types/object'
import { useVar } from '../../definitions/types/useVar'

export function generateSchemaDeclaration(models: ModelModule[]) {
  const aliasFor = (m: ModelModule) => camelCase(m.name)

  return createDef({
    imports: models.map((m) => wildcardImport(aliasFor(m), `./${m.name}`)),
    render: constDeclaration(
      'schema', // Aggregated schemas
      object(models.map((m) => useVar(aliasFor(m)))),
      { export: true }
    ),
  })
}
