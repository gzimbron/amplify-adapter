import { defineConfig } from 'rolldown';

export default defineConfig([
	{
		input: 'src/index.js',
		output: {
			file: 'files/index.js',
			format: 'esm',
		},
	},
	{
		input: 'src/env.js',
		output: {
			file: 'files/env.js',
			format: 'esm',
		},
	},
	{
		input: 'src/handler.js',
		output: {
			file: 'files/handler.js',
			format: 'esm',
			inlineDynamicImports: true,
		},
	},
	{
		input: 'src/shims.js',
		output: {
			file: 'files/shims.js',
			format: 'esm',
		},
	},
]);
