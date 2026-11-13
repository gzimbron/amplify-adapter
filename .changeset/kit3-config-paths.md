---
"amplify-adapter": patch
---

Read `builder.config.paths` instead of the deprecated `builder.config.kit` on SvelteKit 3, so builds no longer print `adapter_config_kit_deprecated`. SvelteKit 2 keeps reading `builder.config.kit.paths`.
