import { Adapter } from '@sveltejs/kit';
import './ambient.js';

declare global {
	const ENV_PREFIX: string;
}

interface AdapterOptions {
	/**
	 * Default: 'build'
	 */
	out?: string;
	/**
	 * Default: false
	 */
	precompress?: boolean;
	envPrefix?: string;
	/**
	 * Default: true
	 */
	polyfill?: boolean;
	/**
	 * Default: false
	 * Copy the node_modules folder to the output directory
	 * including all devDependencies and dependencies
	 */
	copyDevNodeModules?: boolean;
	/**
	 * Default: true
	 * If true, devDependencies and scripts are removed
	 * from package.json in the output directory
	 */
	cleanPackageJson?: boolean;
	/**
	 * Default: true
	 * If true, the .npmrc file is copied to the output directory
	 */
	copyNpmrc?: boolean;

	/**
	 * Default: 3600
	 * The max-age value for the static cache
	 */
	staticCacheMaxAge?: number;

	/**
	 * Default: false
	 * If true, the dependencies are kept in the output package.json
	 */
	keepPackageDependencies?: boolean;
}

export default function plugin(options?: AdapterOptions): Adapter;
