import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

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
		keepPackageDependencies = false,
		copyNpmrc = true,
		staticCacheMaxAge = 3600,
		nodeVersion = 'nodejs22.x',
	} = opts;

	const buildername = 'amplify-adapter';

	return {
		name: buildername,
		supports: {
			read: () => true,
			instrumentation: () => true,
		},
		async adapt(builder) {
			const tmp = builder.getBuildDirectory(buildername);
			const computePath = `${out}/compute/default`;

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

			/** @type {Record<string, string>} */
			const input = {
				index: `${tmp}/index.js`,
				manifest: `${tmp}/manifest.js`,
			};

			if (builder.hasServerInstrumentationFile?.()) {
				input['instrumentation.server'] = `${tmp}/instrumentation.server.js`;
			}

			// we bundle the Vite output so that deployments only need
			// their production dependencies. Anything in devDependencies
			// will get included in the bundled code
			const bundle = await rolldown({
				input,
				platform: 'node',
				treeshake: true,
				shimMissingExports: true,
				external: keepPackageDependencies
					? [...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`))]
					: undefined,
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

			const thefiles = await readdirSync(files);
			for (const file of thefiles) {
				const thefilepath = files + '/' + file;
				builder.copy(thefilepath, computePath + '/' + file, {
					replace: {
						ENV: './env.js',
						HANDLER: './handler.js',
						MANIFEST: './server/manifest.js',
						SERVER: './server/index.js',
						SHIMS: './shims.js',
						ENV_PREFIX: JSON.stringify(envPrefix),
					},
				});
			}

			if (builder.hasServerInstrumentationFile?.()) {
				builder.instrument?.({
					entrypoint: `${computePath}/index.js`,
					instrumentation: `${computePath}/server/instrumentation.server.js`,
					module: {
						exports: ['path', 'host', 'port', 'server'],
					},
				});
			}

			console.log('copied them all ');

			writeFileSync(
				`${out}/deploy-manifest.json`,
				JSON.stringify({
					version: 1,
					framework: { name: 'SvelteKit', version: '2.11.1' },
					routes: [
						{
							path: '/*.*',
							target: {
								kind: 'Static',
								cacheControl: `public, max-age=${staticCacheMaxAge}`,
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
							runtime: nodeVersion,
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

				if (!keepPackageDependencies) {
					delete packageJson.dependencies;
				}
				delete packageJson.scripts;
				writeFileSync(`${computePath}/package.json`, JSON.stringify(packageJson, null, 2), 'utf-8');
			} else {
				builder.copy('package.json', `${computePath}/package.json`, {});
			}
		},
	};
}
