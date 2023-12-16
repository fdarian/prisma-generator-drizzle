export interface IValue {
  render(): string
}

export function createValue<TValue extends IValue>(options: TValue) {
  return options
}
