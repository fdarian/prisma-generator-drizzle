export type Email = string & { readonly __brand: 'Email' }

export type UserId = number & { readonly __brand: 'UserId' }

export type Settings = { theme: string }

export type Item = { sku: string; quantity: number }

export function makeId(): string {
	return 'id'
}

export default function slugify(value: string): string {
	return value.toLowerCase()
}
