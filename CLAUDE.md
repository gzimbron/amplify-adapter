# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **amplify-adapter**, a SvelteKit adapter for deploying applications to AWS Amplify Hosting with SSR support. It generates the deployment structure required by AWS Amplify's compute and static hosting infrastructure.

## Commands

```bash
pnpm build            # Bundle the adapter using rolldown
pnpm dev              # Watch mode compilation
pnpm lint             # Check formatting with Prettier
pnpm format           # Fix formatting with Prettier
pnpm changeset        # Create a changeset for version management
pnpm release          # Publish to npm (main branch only)
```

## Architecture

### Adapter Entry Point
- `index.js` - Main SvelteKit adapter export implementing the `adapt()` method
- `index.d.ts` - TypeScript definitions for adapter options

### Server Runtime (src/)
The `src/` directory contains runtime code bundled into `files/` for deployment:

- `src/index.js` - Server entry point using Polka.js
- `src/handler.js` - HTTP request middleware stack (prerendered content → client assets → static files → SSR)
- `src/env.js` - Environment variable utilities with prefix support
- `src/shims.js` - Node.js polyfills for SvelteKit compatibility

### Build Output Structure
The adapter generates this structure in the `build/` directory:
```
build/
├── deploy-manifest.json     # Amplify deployment configuration
├── compute/default/         # Lambda-like compute resources
│   ├── index.js            # Server entry
│   ├── server/             # Bundled SvelteKit server
│   ├── handler.js, env.js, shims.js
│   └── prerendered/        # Static prerendered pages
└── static/                  # Client-side assets
```

### Bundling
- Uses Rolldown (`rolldown.config.js`) to create 4 separate bundles from `src/`
- Template placeholders (ENV, HANDLER, MANIFEST, SERVER, SHIMS) are replaced during build
- Inline sourcemaps with path transformation

## Release Workflow

Uses Changesets for semantic versioning:
- **main branch**: Stable releases via automated PR
- **next branch**: Pre-releases (e.g., 1.2.3-next.0)

To contribute changes:
1. Make code changes
2. Run `pnpm changeset` to document the change type (patch/minor/major)
3. Commit and create PR

## Key Adapter Options

| Option | Default | Purpose |
|--------|---------|---------|
| `out` | 'build' | Output directory |
| `precompress` | false | Enable gzip/brotli compression |
| `envPrefix` | '' | Prefix for environment variables |
| `keepPackageDependencies` | false | Mark dependencies as external |
| `copyDevNodeModules` | false | Include all node_modules in output |

## Constraints

- AWS Amplify artifact size limit: **200 MB**
- Requires SvelteKit v2.4.0+
- Node.js 22.x runtime in deployed environment
