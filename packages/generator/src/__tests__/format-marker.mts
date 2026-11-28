/** Stands in for a custom `formatter` command: node runs this file directly */
import fs from 'node:fs'
import path from 'node:path'

const MARKER = '// formatted by format-marker.mts\n'

const args = process.argv.slice(2)
const target = args.at(-1)
if (target == null)
	throw new Error('Expected the output path as the last argument')

if (args.includes('--fail')) process.exit(1)

const files = fs.statSync(target).isDirectory()
	? fs
			.readdirSync(target)
			.filter((name) => name.endsWith('.ts'))
			.map((name) => path.join(target, name))
	: [target]

for (const file of files) {
	fs.writeFileSync(file, MARKER + fs.readFileSync(file, 'utf-8'))
}
