import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'node:fs';

// --- Mocks ---

vi.mock('rolldown', () => ({
	rolldown: vi.fn().mockResolvedValue({
		write: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('node:fs', () => {
	return {
		readdirSync: vi.fn().mockReturnValue(['index.js', 'env.js', 'handler.js', 'shims.js']),
		readFileSync: vi.fn().mockReturnValue(
			JSON.stringify({
				name: 'test-app',
				version: '1.0.0',
				dependencies: { 'some-dep': '1.0.0' },
				devDependencies: { vite: '5.0.0' },
				scripts: { build: 'vite build', dev: 'vite' },
			})
		),
		writeFileSync: vi.fn(),
	};
});

// --- Helpers ---

function createMockBuilder(overrides = {}) {
	return {
		getBuildDirectory: vi.fn().mockReturnValue('.svelte-kit/amplify-adapter'),
		rimraf: vi.fn(),
		mkdirp: vi.fn(),
		log: { minor: vi.fn() },
		writeClient: vi.fn(),
		writePrerendered: vi.fn(),
		compress: vi.fn().mockResolvedValue(undefined),
		writeServer: vi.fn(),
		generateManifest: vi.fn().mockReturnValue('{ /* manifest */ }'),
		prerendered: { paths: [] },
		copy: vi.fn(),
		hasServerInstrumentationFile: vi.fn().mockReturnValue(false),
		config: { kit: { paths: { base: '' } } },
		...overrides,
	};
}

function getDeployManifest() {
	const call = vi
		.mocked(fs.writeFileSync)
		.mock.calls.find(([path]) => String(path).endsWith('deploy-manifest.json'));
	if (!call) throw new Error('deploy-manifest.json was not written');
	return JSON.parse(String(call[1]));
}

function getWrittenPackageJson(out = 'build') {
	const call = vi
		.mocked(fs.writeFileSync)
		.mock.calls.find(([path]) => String(path) === `${out}/compute/default/package.json`);
	if (!call) throw new Error('package.json was not written');
	return JSON.parse(String(call[1]));
}

// --- Tests ---

describe('adapter factory shape', async () => {
	const { default: adapter } = await import('../index.js');

	test('returns adapter with correct name', () => {
		const result = adapter();
		expect(result.name).toBe('amplify-adapter');
	});

	test('adapter supports read', () => {
		const result = adapter();
		expect(result.supports.read()).toBe(true);
	});

	test('adapter supports instrumentation', () => {
		const result = adapter();
		expect(result.supports.instrumentation()).toBe(true);
	});

	test('adapt is a function', () => {
		const result = adapter();
		expect(typeof result.adapt).toBe('function');
	});
});

describe('deploy-manifest.json', async () => {
	const { default: adapter } = await import('../index.js');

	beforeEach(() => {
		vi.mocked(fs.writeFileSync).mockClear();
	});

	test('writes deploy-manifest.json', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		const manifest = getDeployManifest();
		expect(manifest).toBeDefined();
	});

	test('has version 1', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		expect(getDeployManifest().version).toBe(1);
	});

	test('identifies framework as SvelteKit', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		expect(getDeployManifest().framework.name).toBe('SvelteKit');
	});

	test('has static route for files with extension', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		const { routes } = getDeployManifest();
		const staticRoute = routes.find((r) => r.path === '/*.*');

		expect(staticRoute).toBeDefined();
		expect(staticRoute.target.kind).toBe('Static');
	});

	test('has compute route for all other paths', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		const { routes } = getDeployManifest();
		const computeRoute = routes.find((r) => r.path === '/*');

		expect(computeRoute).toBeDefined();
		expect(computeRoute.target.kind).toBe('Compute');
		expect(computeRoute.target.src).toBe('default');
	});

	test('uses nodejs20.x runtime', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		const { computeResources } = getDeployManifest();
		expect(computeResources[0].runtime).toBe('nodejs20.x');
		expect(computeResources[0].entrypoint).toBe('index.js');
	});

	test('uses staticCacheMaxAge option in cache-control header', async () => {
		const builder = createMockBuilder();
		await adapter({ staticCacheMaxAge: 86400 }).adapt(builder);

		const { routes } = getDeployManifest();
		const staticRoute = routes.find((r) => r.path === '/*.*');

		expect(staticRoute.target.cacheControl).toContain('86400');
	});

	test('default staticCacheMaxAge is 3600', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		const { routes } = getDeployManifest();
		const staticRoute = routes.find((r) => r.path === '/*.*');

		expect(staticRoute.target.cacheControl).toContain('3600');
	});
});

describe('builder interactions', async () => {
	const { default: adapter } = await import('../index.js');

	beforeEach(() => {
		vi.mocked(fs.writeFileSync).mockClear();
	});

	test('calls builder.rimraf on output directory', async () => {
		const builder = createMockBuilder();
		await adapter({ out: 'dist' }).adapt(builder);

		expect(builder.rimraf).toHaveBeenCalledWith('dist');
	});

	test('calls builder.writeClient with static path', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		expect(builder.writeClient).toHaveBeenCalledWith('build/static');
	});

	test('calls builder.writePrerendered with correct path', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		expect(builder.writePrerendered).toHaveBeenCalledWith('build/compute/default/prerendered');
	});

	test('does not call builder.compress when precompress is false (default)', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		expect(builder.compress).not.toHaveBeenCalled();
	});

	test('calls builder.compress on both dirs when precompress is true', async () => {
		const builder = createMockBuilder();
		await adapter({ precompress: true }).adapt(builder);

		expect(builder.compress).toHaveBeenCalledWith('build/static');
		expect(builder.compress).toHaveBeenCalledWith('build/compute/default/prerendered');
	});

	test('copies .npmrc when copyNpmrc is true (default)', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		expect(builder.copy).toHaveBeenCalledWith(
			'.npmrc',
			'build/compute/default/.npmrc',
			expect.any(Object)
		);
	});

	test('does not copy .npmrc when copyNpmrc is false', async () => {
		const builder = createMockBuilder();
		await adapter({ copyNpmrc: false }).adapt(builder);

		const npmrcCall = builder.copy.mock.calls.find(([src]) => src === '.npmrc');
		expect(npmrcCall).toBeUndefined();
	});

	test('copies node_modules when copyDevNodeModules is true', async () => {
		const builder = createMockBuilder();
		await adapter({ copyDevNodeModules: true }).adapt(builder);

		expect(builder.copy).toHaveBeenCalledWith(
			'node_modules',
			'build/compute/default/node_modules',
			expect.any(Object)
		);
	});

	test('does not copy node_modules by default', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		const nodeModulesCall = builder.copy.mock.calls.find(([src]) => src === 'node_modules');
		expect(nodeModulesCall).toBeUndefined();
	});
});

describe('package.json output', async () => {
	const { default: adapter } = await import('../index.js');

	beforeEach(() => {
		vi.mocked(fs.writeFileSync).mockClear();
	});

	test('removes devDependencies when cleanPackageJson is true (default)', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		const pkg = getWrittenPackageJson();
		expect(pkg.devDependencies).toBeUndefined();
	});

	test('removes scripts when cleanPackageJson is true (default)', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		const pkg = getWrittenPackageJson();
		expect(pkg.scripts).toBeUndefined();
	});

	test('removes dependencies when keepPackageDependencies is false (default)', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		const pkg = getWrittenPackageJson();
		expect(pkg.dependencies).toBeUndefined();
	});

	test('keeps dependencies when keepPackageDependencies is true', async () => {
		const builder = createMockBuilder();
		await adapter({ keepPackageDependencies: true }).adapt(builder);

		const pkg = getWrittenPackageJson();
		expect(pkg.dependencies).toBeDefined();
		expect(pkg.dependencies['some-dep']).toBe('1.0.0');
	});

	test('still removes devDependencies when keepPackageDependencies is true', async () => {
		const builder = createMockBuilder();
		await adapter({ keepPackageDependencies: true }).adapt(builder);

		const pkg = getWrittenPackageJson();
		expect(pkg.devDependencies).toBeUndefined();
	});
});

describe('polyfill option', async () => {
	const { default: adapter } = await import('../index.js');

	beforeEach(() => {
		vi.mocked(fs.writeFileSync).mockClear();
	});

	test('writes empty shims.js when polyfill is false', async () => {
		const builder = createMockBuilder();
		await adapter({ polyfill: false }).adapt(builder);

		const shimsCall = vi
			.mocked(fs.writeFileSync)
			.mock.calls.find(([path]) => String(path).endsWith('shims.js'));
		expect(shimsCall).toBeDefined();
		expect(shimsCall[1]).toBe('');
	});

	test('does not write empty shims.js when polyfill is true (default)', async () => {
		const builder = createMockBuilder();
		await adapter().adapt(builder);

		const shimsCall = vi
			.mocked(fs.writeFileSync)
			.mock.calls.find(([path, content]) => String(path).endsWith('shims.js') && content === '');
		expect(shimsCall).toBeUndefined();
	});
});
