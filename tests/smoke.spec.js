/**
 * Smoke tests for the HTTP server entry point (src/index.js).
 *
 * These tests verify that the server starts correctly and handles
 * basic configuration via environment variables.
 *
 * Note: src/index.js uses template placeholders (HANDLER, ENV) that are
 * replaced at SvelteKit build time. Here we mock those modules so the
 * server can be tested in isolation.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.hoisted(() => {
	vi.stubGlobal('ENV_PREFIX', '');
});

// Mock the HANDLER placeholder (resolved to ./handler.js at build time)
vi.mock('HANDLER', () => ({
	handler: (_req, res, next) => next(),
}));

// Mock the ENV placeholder (resolved to ./env.js at build time)
vi.mock('ENV', () => ({
	env: (name, fallback) => process.env[name] ?? fallback,
}));

describe('server startup', async () => {
	let serverModule;

	beforeEach(async () => {
		vi.resetModules();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		if (serverModule?.server) {
			serverModule.server.server?.close();
		}
	});

	test('exports host, port and server', async () => {
		serverModule = await import('../src/index.js');

		expect(serverModule.host).toBeDefined();
		expect(serverModule.port).toBeDefined();
		expect(serverModule.server).toBeDefined();
	});

	test('defaults to host 0.0.0.0', async () => {
		serverModule = await import('../src/index.js');
		expect(serverModule.host).toBe('0.0.0.0');
	});

	test('defaults to port 3000', async () => {
		serverModule = await import('../src/index.js');
		expect(serverModule.port).toBe('3000');
	});

	test('uses PORT env var when set', async () => {
		vi.stubEnv('PORT', '4000');
		serverModule = await import('../src/index.js');
		expect(serverModule.port).toBe('4000');
	});

	test('uses HOST env var when set', async () => {
		vi.stubEnv('HOST', '127.0.0.1');
		serverModule = await import('../src/index.js');
		expect(serverModule.host).toBe('127.0.0.1');
	});

	test('uses SOCKET_PATH when set, setting port to false', async () => {
		vi.stubEnv('SOCKET_PATH', '/tmp/app.sock');
		serverModule = await import('../src/index.js');
		expect(serverModule.path).toBe('/tmp/app.sock');
		expect(serverModule.port).toBe(false);
	});
});
