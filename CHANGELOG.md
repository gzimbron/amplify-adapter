# amplify-adapter

## 1.4.0

### Minor Changes

- 5491188: Add SvelteKit 3 support. SvelteKit 3 removed `Builder.generateManifest()` in favor of `Builder.generateServerInstance()`, so the adapter now uses that API when it's available and falls back to the old `generateManifest()` + `Server` class path on SvelteKit 2. The `peerDependencies` range is widened to `^2.4.0 || ^3.0.0` accordingly.

## 1.3.0

### Minor Changes

- 52f99e3: Add configurable `nodeVersion` adapter option for AWS Amplify compute runtime. Default updated from `nodejs20.x` to `nodejs22.x`.

## 1.2.3

### Patch Changes

- 92af7dc: Fix: Adjusting entrypoint path to resolve Amplify runtime error

## 1.2.1

### Patch Changes

- ba3b972: latest version patch

## 1.2.0

### Minor Changes

- Add support for SvelteKit instrumentation.

## 1.1.0

### Minor Changes

- 4e768da: - Add keepPackageDependencies adapter option, for v0.2.0 compatibility

## 1.0.0

### Major Changes

- 9c89e0e: Using migrating to rolldown

### Patch Changes

- 8cd2c6d: Added cacheMaxAge parameter
- 67d3709: switch to rolldown
- 0d5fe19: version:next + release:next
- 0d5fe19: scripts updates

## 1.0.0-next.2

### Patch Changes

- Added cacheMaxAge parameter

## 1.0.0-next.2

### Patch Changes

- 0d5fe19: version:next + release:next

## 1.0.0-next.1

### Patch Changes

- scripts updates

## 1.0.0-next.0

### Major Changes

- 9c89e0e: Using migrating to rolldown

### Patch Changes

- 67d3709: switch to rolldown

## 0.2.0

### Minor Changes

- 6e38d97: Upgrade node runtime to 20.x

## 0.1.3

### Patch Changes

- 022c1ed: Update documentation

## 0.1.2

### Patch Changes

- 99db5b7: This version will fix issue: #6

## 0.1.1

### Patch Changes

- 478d489: Removed console.log from adapt function
