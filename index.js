import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('.').default} */
export default function (opts = {}) {
	const {
		out = 'build',
		precompress = false,
		envPrefix = '',
		polyfill = true,
		copyDevNodeModules = false,
		cleanPackageJson = true,
		copyNpmrc = true,
	} = opts;

	const buildername = 'amplify-adapter';

	return {
		name: buildername,

		async adapt(builder) {
			const tmp = builder.getBuildDirectory(buildername);
			const computePath = `${out}/compute/default`;

			console.log(tmp);

			builder.rimraf(out);
			builder.rimraf(tmp);
			builder.mkdirp(tmp);

			builder.log.minor('Copying assets');
			builder.writeClient(`${out}/static${builder.config.kit.paths.base}`);
			builder.writePrerendered(`${computePath}/prerendered${builder.config.kit.paths.base}`);

			if (precompress) {
				builder.log.minor('Compressing assets');
				await Promise.all([
					builder.compress(`${out}/static`),
					builder.compress(`${computePath}/prerendered`),
				]);
			}

			builder.log.minor('Building server');

			builder.writeServer(tmp);

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath: './' })};\n\n` +
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`
			);

			const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

			// we bundle the Vite output so that deployments only need
			// their production dependencies. Anything in devDependencies
			// will get included in the bundled code
			const bundle = await rollup({
				input: {
					index: `${tmp}/index.js`,
					manifest: `${tmp}/manifest.js`,
				},
				external: [
					// dependencies could have deep exports, so we need a regex
					...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`)),
				],
				plugins: [
					nodeResolve({
						preferBuiltins: true,
						exportConditions: ['node'],
					}),
					commonjs({ strictRequires: true }),
					json(),
				],
			});

			await bundle.write({
				dir: `${computePath}/server`,
				format: 'esm',
				sourcemap: true,
				sourcemapPathTransform: (relativePath) => {
					let regex = new RegExp(`((..\/)+.svelte-kit\/${buildername}\/)`, 'g');
					relativePath = relativePath.replace(regex, './');

					regex = new RegExp(`((..\/)+node_modules/)`, 'g');
					relativePath = relativePath.replace(regex, '../node_modules');

					return relativePath;
				},
				chunkFileNames: 'chunks/[name]-[hash].js',
			});

			builder.copy(files, computePath, {
				replace: {
					ENV: './env.js',
					HANDLER: './handler.js',
					MANIFEST: './server/manifest.js',
					SERVER: './server/index.js',
					SHIMS: './shims.js',
					ENV_PREFIX: JSON.stringify(envPrefix),
				},
			});

			writeFileSync(
				`${out}/deploy-manifest.json`,
				JSON.stringify({
					version: 1,
					framework: { name: 'SvelteKit', version: '0.0.3' },
					routes: [
						{
							path: '/*.*',
							target: {
								kind: 'Static',
								cacheControl: 'public, max-age=2',
							},
							fallback: {
								kind: 'Compute',
								src: 'default',
							},
						},
						{
							path: '/*',
							target: {
								kind: 'Compute',
								src: 'default',
							},
						},
					],
					computeResources: [
						{
							name: 'default',
							runtime: 'nodejs18.x',
							entrypoint: 'index.js',
						},
					],
				})
			);

			// If polyfills aren't wanted then clear the file
			if (!polyfill) {
				writeFileSync(`${computePath}/shims.js`, '', 'utf-8');
			}

			if (copyDevNodeModules) {
				builder.copy('node_modules', `${computePath}/node_modules`, {});
			}
			if (copyNpmrc) {
				builder.copy('.npmrc', `${computePath}/.npmrc`, {});
			}

			if (cleanPackageJson) {
				const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
				delete packageJson.devDependencies;
				delete packageJson.scripts;
				writeFileSync(`${computePath}/package.json`, JSON.stringify(packageJson, null, 2), 'utf-8');
			} else {
				builder.copy('package.json', `${computePath}/package.json`, {});
			}
		},
	};
}
