export interface IValue {
  render(): string
}

export function createValue(options: IValue) {
  return {
    render: options.render,
  }
}
