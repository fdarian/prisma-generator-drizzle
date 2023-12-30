import { camelCase } from 'lodash'
import { ModelModule } from '../../../generator'
import { wildcardImport } from '../../syntaxes/imports'

export function generateSchemaDeclaration(models: ModelModule[]) {
  const aliasFor = (m: ModelModule) => camelCase(m.name)

  return {
    imports: models.map((m) => wildcardImport(aliasFor(m), `./${m.name}`)),
    code: `export const schema = { ${models
      .map((m) => `...${aliasFor(m)}`)
      .join(', ')} };`,
  }
}
