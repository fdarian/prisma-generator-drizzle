// #region Base
export interface IValue {
  render(): string
}

function createValue(options: IValue) {
  return {
    render: options.render,
  }
}
// #endregion

function numberValue(value: number) {
  return createValue({
    render: () => `${value}`,
  })
}

function stringValue(value: string) {
  return createValue({
    render: () => `'${value}'`,
  })
}

function objectValue(entries: [string, IValue][]) {
  return createValue({
    render(): string {
      return `{ ${entries
        .map(([key, value]) => `${key}: ${value.render()}`)
        .join(', ')} }`
    },
  })
}

function funcValue(name: string, args?: IValue[]) {
  return createValue({
    render() {
      return `${name}(${args?.map(render).join(', ')})`
    },
  })
}

export const v = {
  number: numberValue,
  string: stringValue,
  object: objectValue,
  func: funcValue,
}

// #region Utils
export function render(value: IValue) {
  return value.render()
}
// #endregion
