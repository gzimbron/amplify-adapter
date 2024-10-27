import { handler } from 'HANDLER';
import { env } from 'ENV';
import polka from 'polka';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export const path = env('SOCKET_PATH', false);
export const host = env('HOST', '0.0.0.0');
export const port = env('PORT', !path && '3000');

const server = polka().use(handler);

loadEnv();

server.listen({ path, host, port }, () => {
	console.log(`Listening on ${path ? path : host + ':' + port}`);
});

function loadEnv() {
	if (!existsSync('.env')) {
		return;
	}

	const envPath = resolve(process.cwd(), '.env');
	const envData = readFileSync(envPath, 'utf-8');
	const envVariables = envData.split('\n');

	envVariables.forEach((line) => {
		const [key, value] = line.split('=');
		if (key && value && !process.env[key.trim()]) {
			process.env[key.trim()] = value.trim();
		}
	});
}

export { server };
