/** The multi-schema fixture resets the `public` schema, so it can't share a database with the main postgres fixture */
export function getMultiSchemaDatabaseUrl(baseUrl: string) {
	const url = new URL(baseUrl)
	url.pathname = `${url.pathname}_multi_schema`
	return url.toString()
}
