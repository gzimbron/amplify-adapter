declare module 'ENV' {
	export function env(key: string, fallback?: any): string;
}

declare module 'HANDLER' {
	export const handler: import('polka').Middleware;
}

declare module 'PRERENDERED' {
	export const prerendered: Set<string>;
}

declare module 'SERVER' {
	// the object returned by `create_server(manifest)` — see
	// https://svelte.dev/docs/kit/@sveltejs-kit#Server, or (SvelteKit 2 fallback)
	// `new Server(manifest)`, which has the same `init`/`respond` shape.
	export const server: {
		init(opts: { env: Record<string, string> }): Promise<void>;
		respond: InstanceType<typeof import('@sveltejs/kit').Server>['respond'];
	};
}

declare namespace App {
	export interface Platform {
		/**
		 * The original Node request object (https://nodejs.org/api/http.html#class-httpincomingmessage)
		 */
		req: import('http').IncomingMessage;
	}
}
