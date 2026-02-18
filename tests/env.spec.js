import { afterEach, describe, expect, test, vi } from 'vitest';

// Stub ENV_PREFIX global before any module is imported
vi.hoisted(() => {
	vi.stubGlobal('ENV_PREFIX', '');
});

describe('env() — without prefix', async () => {
	const { env } = await import('../src/env.js');

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	test('returns the env var value when set', () => {
		vi.stubEnv('PORT', '4000');
		expect(env('PORT', '3000')).toBe('4000');
	});

	test('returns the fallback when var is not set', () => {
		expect(env('PORT', '3000')).toBe('3000');
	});

	test('returns false as fallback', () => {
		expect(env('SOCKET_PATH', false)).toBe(false);
	});

	test('returns undefined as fallback when not provided', () => {
		expect(env('SOCKET_PATH', undefined)).toBeUndefined();
	});

	test('handles HOST var correctly', () => {
		vi.stubEnv('HOST', '127.0.0.1');
		expect(env('HOST', '0.0.0.0')).toBe('127.0.0.1');
	});

	test('returns fallback for ORIGIN when not set', () => {
		expect(env('ORIGIN', undefined)).toBeUndefined();
	});

	test('returns ORIGIN value when set', () => {
		vi.stubEnv('ORIGIN', 'https://example.com');
		expect(env('ORIGIN', undefined)).toBe('https://example.com');
	});
});

describe('env() — with prefix', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.resetModules();
		// Restore default empty prefix for other tests
		vi.stubGlobal('ENV_PREFIX', '');
	});

	test('reads prefixed env var', async () => {
		vi.stubGlobal('ENV_PREFIX', 'MY_APP_');
		vi.stubEnv('MY_APP_PORT', '5000');

		vi.resetModules();
		const { env } = await import('../src/env.js');

		expect(env('PORT', '3000')).toBe('5000');
	});

	test('ignores non-prefixed var when prefix is set', async () => {
		vi.stubGlobal('ENV_PREFIX', 'MY_APP_');
		vi.stubEnv('PORT', '4000');

		vi.resetModules();
		const { env } = await import('../src/env.js');

		expect(env('PORT', '3000')).toBe('3000');
	});

	test('returns fallback when prefixed var is not set', async () => {
		vi.stubGlobal('ENV_PREFIX', 'MY_APP_');

		vi.resetModules();
		const { env } = await import('../src/env.js');

		expect(env('PORT', '3000')).toBe('3000');
	});
});

describe('ENV_PREFIX conflict detection', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.resetModules();
		vi.stubGlobal('ENV_PREFIX', '');
	});

	test('throws when prefix matches an unexpected env var', async () => {
		vi.stubGlobal('ENV_PREFIX', 'MY_APP_');
		vi.stubEnv('MY_APP_UNKNOWN_SETTING', 'value');

		vi.resetModules();
		await expect(() => import('../src/env.js')).rejects.toThrow('You should change envPrefix');
	});

	test('throws with informative message including the conflicting var name', async () => {
		vi.stubGlobal('ENV_PREFIX', 'MY_APP_');
		vi.stubEnv('MY_APP_UNKNOWN_SETTING', 'value');

		vi.resetModules();
		await expect(() => import('../src/env.js')).rejects.toThrow('MY_APP_UNKNOWN_SETTING');
	});

	test('does not throw when prefixed vars are all in the allowed set', async () => {
		vi.stubGlobal('ENV_PREFIX', 'MY_APP_');
		vi.stubEnv('MY_APP_PORT', '3000');
		vi.stubEnv('MY_APP_HOST', '0.0.0.0');

		vi.resetModules();
		await expect(import('../src/env.js')).resolves.toBeDefined();
	});

	test('does not throw when ENV_PREFIX is empty string', async () => {
		vi.stubGlobal('ENV_PREFIX', '');
		vi.stubEnv('UNKNOWN_VAR', 'value');

		vi.resetModules();
		await expect(import('../src/env.js')).resolves.toBeDefined();
	});
});
