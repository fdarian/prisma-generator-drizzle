import { flatMap } from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import { reduceImports } from '../../generator'
import { ImportValue } from './imports'

export type Module = ReturnType<typeof createModule>

export function createModule<
  Input extends {
    declarations: { imports: ImportValue[]; code: string }[]
    name: string
  },
>(input: Input) {
  const imports = pipe(
    input.declarations,
    flatMap((d) => d.imports),
    reduceImports
  )

  const code = [
    imports.map((i) => i.render()).join('\n'),
    ...input.declarations.map((d) => d.code),
  ].join('\n\n')

  return {
    ...input,
    name: input.name,
    code,
  }
}
