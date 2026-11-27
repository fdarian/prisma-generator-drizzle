import { getModuleResolution } from '~/shared/generator-context'

export function namedImport(
	names: string[],
	path: string,
	isTypeImport = false
) {
	return {
		type: 'namedImport' as const,
		names: names,
		module: path,
		isTypeImport,
		render() {
			// biome-ignore format: off
			return `import ${isTypeImport ? 'type ' : ''}{ ${names.join( ', ')} } from '${renderImportPath(path)}';`
		},
	}
}
export type NamedImport = ReturnType<typeof namedImport>

export function defaultImportValue(
	name: string,
	path: string,
	isTypeImport = false
) {
	return {
		type: 'defaultImport' as const,
		name,
		module: path,
		isTypeImport,
		render() {
			// biome-ignore format: off
			return `import ${isTypeImport ? 'type ' : ''}${name} from '${renderImportPath(path)}';`
		},
	}
}

export function wildcardImport(alias: string, path: string) {
	return {
		type: 'wildcardImport' as const,
		module: path,
		isTypeImport: false,
		render() {
			return `import * as ${alias} from '${renderImportPath(path)}';`
		},
	}
}

export type ImportValue =
	| NamedImport
	| ReturnType<typeof defaultImportValue>
	| ReturnType<typeof wildcardImport>

const HAS_JS_EXTENSION = /\.(js|mjs|cjs|json)$/

/**
 * Adds the .js extension to relative imports.
 */
function renderImportPath(path: string) {
	const moduleResolution = getModuleResolution()
	if (moduleResolution === 'nodenext' || moduleResolution === 'node16') {
		return path.startsWith('.') && !HAS_JS_EXTENSION.test(path)
			? `${path}.js`
			: path
	}

	return path
}
