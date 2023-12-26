type IRenderable = {
  render: () => string
}

type CreateValueOpts = {
  render: IRenderable['render'] | IRenderable
}

export function createValue<TOpts extends CreateValueOpts>(options: TOpts) {
  const { render, ...rest } = options
  return {
    ...rest,
    render: typeof render === 'function' ? render : render.render,
  }
}

export type IValue = ReturnType<typeof createValue>
