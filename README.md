# amplify-adapter

[Adapter](https://kit.svelte.dev/docs/adapters) for SvelteKit apps to Amplify Host CI/CD.

Este paquete se creó para adaptar el paquete @sveltejs/node-adapter para su uso con CI/CD en AWS Amplify + SSR. Este paquete incluye los siguientes cambios:

Limitations:

- Artifacts size limit: 200 MB

## Video tutorial

[![SvelteKit + Amplify CI/CD](./readme_assets/video.jpg)](https://youtu.be/wzA5w3Y67iI)

## Usage

- Install with npm or yarn:

```bash
npm install --save-dev amplify-adapter
```

- Add the adapter to your `svelte.config.js`:

```js
// svelte.config.js
import adapter from 'amplify-adapter';
```

## Amplify CI/CD

- Connect a branch to your Amplify App Hosting for CI/CD (setup default values).

![Connect branch](./readme_assets/connect_branch.jpg)

- Go to `App settings > Build settings > App build specification` and set Artifact folder to `build` (default adapter output folder) and add this lines to `frontend -> build` phase:

```yaml
- cd build/compute/default/
- npm i --production
```

![App build specification](./readme_assets/buildsettings_1.jpg)

- At `App settings > Build settings > Build image settings` clic `Edit` Button, and change `Build image` to `Amazon Linux:2023`.

![Build image settings](./readme_assets/buildsettings_2.jpg)

![Build image settings](./readme_assets/buildsettings_3.jpg)

## License

[MIT](LICENSE)
