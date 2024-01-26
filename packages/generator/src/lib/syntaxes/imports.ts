export function namedImport(names: string[], path: string) {
	return {
		type: 'namedImport' as const,
		names: names,
		module: path,
		render() {
			return `import { ${names.join(', ')} } from '${renderImportPath(path)}';`
		},
	}
}
export type NamedImport = ReturnType<typeof namedImport>

export function defaultImportValue(name: string, path: string) {
	return {
		type: 'defaultImport' as const,
		name,
		module: path,
		render() {
			return `import ${name} from '${renderImportPath(path)}';`
		},
	}
}

export function wildcardImport(alias: string, path: string) {
	return {
		type: 'wildcardImport' as const,
		module: path,
		render() {
			return `import * as ${alias} from '${renderImportPath(path)}';`
		},
	}
}

export type ImportValue =
	| NamedImport
	| ReturnType<typeof defaultImportValue>
	| ReturnType<typeof wildcardImport>

/**
 * Adds the .js extension to relative imports.
 */
function renderImportPath(path: string) {
  return path.startsWith(".") ? `${path}.js` : path;
}
