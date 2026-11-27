export function requireEnv(name: string) {
	const value = process.env[name]
	if (value == null || value === '') {
		throw new Error(`Missing required environment variable: ${name}`)
	}
	return value
}
