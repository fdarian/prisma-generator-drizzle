import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['src/generator.ts', 'src/bin.ts'],
	outDir: 'dist',
	clean: true,
	format: 'cjs',
	fixedExtension: false,
})
