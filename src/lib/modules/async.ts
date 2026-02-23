export const constructor = '__asyncconstructor__'

interface AsyncConstructable {
  [constructor]: (...args: any[]) => Promise<void>
}

export interface AsyncConstructor<T extends AsyncConstructable> {
  new (...args: Parameters<T[typeof constructor]>): Promise<T>
  prototype: T
}

export function asyncify<C extends new (...args: any[]) => AsyncConstructable>(Base: C) {
  return class extends Base {
    constructor (...args: any[]) {
      super(...args)

      return this[constructor](...(args as Parameters<InstanceType<C>[typeof constructor]>)).then(() => this) as unknown as this
    }
  } as unknown as AsyncConstructor<InstanceType<C>>
}
