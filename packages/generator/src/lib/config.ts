import { Dictionary } from '@prisma/sdk'

export function isRelationalQueryEnabled(
  config: Dictionary<string | string[] | undefined>
) {
  const value = config['relationalQuery']
  if (value === 'false') return false
  return true
}
