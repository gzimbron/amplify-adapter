---
"amplify-adapter": minor
---

Add SvelteKit 3 support. SvelteKit 3 removed `Builder.generateManifest()` in favor of `Builder.generateServerInstance()`, so the adapter now uses that API when it's available and falls back to the old `generateManifest()` + `Server` class path on SvelteKit 2. The `peerDependencies` range is widened to `^2.4.0 || ^3.0.0` accordingly.
