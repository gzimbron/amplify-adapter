import 'SHIMS';
import fs from 'node:fs';
import path from 'node:path';
import { createBrotliCompress, createGzip, constants } from 'node:zlib';
import { pipeline } from 'node:stream';
import sirv from 'sirv';
import { fileURLToPath } from 'node:url';
import { parse as polka_url_parser } from '@polka/url';
import { getRequest, setResponse } from '@sveltejs/kit/node';
import { Server } from 'SERVER';
import { manifest, prerendered } from 'MANIFEST';
import { env } from 'ENV';

/* global ENV_PREFIX */

// Matches all text-based content types that benefit from compression:
// - text/* (html, plain, xml, css, etc.)
// - application/json, application/javascript, application/xml
// - Any *+json or *+xml suffix (rss+xml, atom+xml, ld+json, etc.)
// - image/svg+xml
const COMPRESSIBLE_CONTENT_TYPES =
	/^(?:text\/|application\/(?:json|javascript|xml|x-www-form-urlencoded)|[a-z]+\/[a-z0-9.-]*\+(?:json|xml))/i;

/**
 * Negotiates the best compression encoding based on Accept-Encoding header
 * @param {string | undefined} acceptEncoding
 * @returns {'br' | 'gzip' | null}
 */
function negotiate_encoding(acceptEncoding) {
	if (!acceptEncoding) return null;

	// Prefer brotli over gzip for better compression
	if (acceptEncoding.includes('br')) return 'br';
	if (acceptEncoding.includes('gzip')) return 'gzip';
	return null;
}

/**
 * Creates a compression stream based on the encoding
 * @param {'br' | 'gzip'} encoding
 */
function create_compressor(encoding) {
	if (encoding === 'br') {
		return createBrotliCompress({
			params: {
				[constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
				[constants.BROTLI_PARAM_QUALITY]: 4, // Balance between speed and compression
			},
		});
	}
	return createGzip({ level: 6 });
}

const server = new Server(manifest);
await server.init({ env: process.env });
const origin = env('ORIGIN', undefined);
const xff_depth = parseInt(env('XFF_DEPTH', '1'));
const address_header = env('ADDRESS_HEADER', '').toLowerCase();
const protocol_header = env('PROTOCOL_HEADER', '').toLowerCase();
const host_header = env('HOST_HEADER', 'host').toLowerCase();
const body_size_limit = parseInt(env('BODY_SIZE_LIMIT', '524288'));

const dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} path
 * @param {boolean} client
 */
function serve(path, client = false) {
	return (
		fs.existsSync(path) &&
		sirv(path, {
			etag: true,
			gzip: true,
			brotli: true,
			setHeaders:
				client &&
				((res, pathname) => {
					// only apply to build directory, not e.g. version.json
					if (pathname.startsWith(`/${manifest.appPath}/immutable/`) && res.statusCode === 200) {
						res.setHeader('cache-control', 'public,max-age=31536000,immutable');
					}
				}),
		})
	);
}

// required because the static file server ignores trailing slashes
/** @returns {import('polka').Middleware} */
function serve_prerendered() {
	const handler = serve(path.join(dir, 'prerendered'));

	return (req, res, next) => {
		let { pathname, search, query } = polka_url_parser(req);

		try {
			pathname = decodeURIComponent(pathname);
		} catch {
			// ignore invalid URI
		}

		if (prerendered.has(pathname)) {
			return handler(req, res, next);
		}

		// remove or add trailing slash as appropriate
		let location = pathname.at(-1) === '/' ? pathname.slice(0, -1) : pathname + '/';
		if (prerendered.has(location)) {
			if (query) location += search;
			res.writeHead(308, { location }).end();
		} else {
			next();
		}
	};
}

/** @type {import('polka').Middleware} */
const ssr = async (req, res) => {
	/** @type {Request | undefined} */
	let request;

	try {
		request = await getRequest({
			base: origin || get_origin(req.headers),
			request: req,
			bodySizeLimit: body_size_limit,
		});
	} catch (err) {
		res.statusCode = err.status || 400;
		res.end('Invalid request body');
		return;
	}

	const response = await server.respond(request, {
		platform: { req },
		getClientAddress: () => {
			if (address_header) {
				if (!(address_header in req.headers)) {
					throw new Error(
						`Address header was specified with ${
							ENV_PREFIX + 'ADDRESS_HEADER'
						}=${address_header} but is absent from request`
					);
				}

				const value = /** @type {string} */ (req.headers[address_header]) || '';

				if (address_header === 'x-forwarded-for') {
					const addresses = value.split(',');

					if (xff_depth < 1) {
						throw new Error(`${ENV_PREFIX + 'XFF_DEPTH'} must be a positive integer`);
					}

					if (xff_depth > addresses.length) {
						throw new Error(
							`${ENV_PREFIX + 'XFF_DEPTH'} is ${xff_depth}, but only found ${
								addresses.length
							} addresses`
						);
					}
					return addresses[addresses.length - xff_depth].trim();
				}

				return value;
			}

			return (
				req.connection?.remoteAddress ||
				// @ts-expect-error
				req.connection?.socket?.remoteAddress ||
				req.socket?.remoteAddress ||
				// @ts-expect-error
				req.info?.remoteAddress
			);
		},
	});

	// Check if compression should be applied
	const contentType = response.headers.get('content-type');
	const acceptEncoding = /** @type {string | undefined} */ (req.headers['accept-encoding']);
	const encoding = negotiate_encoding(acceptEncoding);

	// Only compress if:
	// - Client accepts compression
	// - Content is compressible (text-based)
	// - Response isn't already encoded
	// - Response has a body
	const shouldCompress =
		encoding &&
		contentType &&
		COMPRESSIBLE_CONTENT_TYPES.test(contentType) &&
		!response.headers.get('content-encoding') &&
		response.body;

	if (shouldCompress && response.body) {
		// Clone headers and modify for compression
		const headers = new Headers(response.headers);
		headers.set('content-encoding', encoding);
		headers.delete('content-length'); // Length changes after compression
		headers.append('vary', 'Accept-Encoding');

		// Write status and headers
		res.writeHead(response.status, Object.fromEntries(headers));

		// Stream and compress the response body
		const compressor = create_compressor(encoding);
		const reader = response.body.getReader();

		compressor.on('data', (chunk) => res.write(chunk));
		compressor.on('end', () => res.end());
		compressor.on('error', (err) => {
			console.error('Compression error:', err);
			res.end();
		});

		// Pump data from response body to compressor
		(async () => {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						compressor.end();
						break;
					}
					compressor.write(value);
				}
			} catch (err) {
				console.error('Stream error:', err);
				compressor.end();
			}
		})();
	} else {
		// No compression, use standard setResponse
		setResponse(res, response);
	}
};

/** @param {import('polka').Middleware[]} handlers */
function sequence(handlers) {
	/** @type {import('polka').Middleware} */
	return (req, res, next) => {
		/**
		 * @param {number} i
		 * @returns {ReturnType<import('polka').Middleware>}
		 */
		function handle(i) {
			if (i < handlers.length) {
				return handlers[i](req, res, () => handle(i + 1));
			} else {
				return next();
			}
		}

		return handle(0);
	};
}

/**
 * @param {import('http').IncomingHttpHeaders} headers
 * @returns
 */
function get_origin(headers) {
	const protocol = (protocol_header && headers[protocol_header]) || 'https';
	const host = headers[host_header];
	return `${protocol}://${host}`;
}

export const handler = sequence(
	[
		serve(path.join(dir, 'client'), true),
		serve(path.join(dir, 'static')),
		serve_prerendered(),
		ssr,
	].filter(Boolean)
);
