/**
 * @description Combines members of an intersection into a readable type.
 *
 * @see {@link https://twitter.com/mattpocockuk/status/1622730173446557697?s=20&t=NdpAcmEFXY01xkqU3KO0Mg}
 * @example
 * Prettify<{ a: string } & { b: string } & { c: number, d: bigint }>
 * => { a: string, b: string, c: number, d: bigint }
 */
export type Prettify<T> = {
	[K in keyof T]: T[K]
} & {}

export type MakeRequired<
	shake extends Record<string, any>,
	key extends keyof shake,
> = Omit<shake, key> & Required<Pick<shake, key>>

export type ModifyType<
	shape extends Record<string, any>,
	key extends keyof shape,
	modified,
> = Omit<shape, key> & Record<key, modified>
