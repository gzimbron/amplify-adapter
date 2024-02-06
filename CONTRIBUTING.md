# Amplify Adapter Contributing Guide

## Preparing

Please use pnpm to install dependencies. If you don't have pnpm installed, you can install it with npm:

```bash
npm i -g pnpm
```

## Sending PRs

### Coding style

There are a few guidelines we follow:

- Ensure `pnpm lint` pass. You can run `pnpm format` to format the code

To use the git hooks in the repo, which will save you from waiting for CI to tell you that you forgot to lint, run this:

```bash
git config core.hookspath .githooks
```

### Generating changelogs

For changes to be reflected in package changelogs, run `pnpm changeset` and follow the prompts.

## Releases

The [Changesets GitHub action](https://github.com/changesets/action#with-publishing) will create and update a PR that applies changesets and publishes new versions of amplify adapter.
