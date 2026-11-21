# Contributing a plugin

Thanks for making something for Marky. Plugins here show up in Marky under
**Manage plugins… › Plugin market**, where people can search, read the details and install them.

## 1. Write the plugin

One `.js` file in `plugins/`, starting with a header. See Marky's plugin guide for the API.

```js
/* marky-plugin
{
  "id": "my-plugin",
  "name": "My plugin",
  "version": "1.0.0",
  "description": "One sentence: what it does (up to 300 characters).",
  "author": "Your name",
  "category": "writing",
  "details": "Optional. A longer explanation for the details view: how to use it, what it shows.",
  "changes": "Optional. What changed in this version (shown to people who update).",
  "permissions": ["document:read", "panel"]
}
*/
Marky.definePlugin({ activate(marky) { /* … */ } });
```

- **category**: one of `writing`, `structure`, `data`, `productivity`, `language`, `other`.
- **permissions**: ask only for what you need. People see them in plain words before installing,
  and an update that asks for more is shown with the new permissions marked.
- Plugins run in a sandbox: no network, no files, no `eval` of user text you don't control,
  no tracking. Output is sanitised (no scripts, styles or event handlers).
- When you update a plugin, raise its `version` and describe the update in `changes`.

## 2. Test it

```sh
npm ci
npm test            # or: node --test test/*.test.mjs
```

Add a test for your plugin to `test/plugins.test.mjs`: `loadPlugin()` runs it the way
Marky does and returns what it registered (renderers, commands, panel, status bar).

## 3. Update the index and open a pull request

```sh
npm run index
```

Commit your plugin, its test and the updated `index.json`. CI checks the header, runs the
tests and checks that `index.json` matches.

## 4. Review and signing (maintainer)

Marky only shows the list when `index.json.sig` is a valid signature by the maintainer's key,
whose public half is built into Marky and kept in `signing-public-key.txt`. So nobody can add
or change a plugin, not even with write access to this repository, without the maintainer
reviewing it and signing.

After reviewing the code (all of it: it's what people install):

```sh
git checkout <the pull request branch>
npm run index        # should change nothing
npm run sign         # uses ~/.marky/plugins-signing.key (or MARKY_PLUGINS_KEY)
npm run verify
git commit -am "Sign index" && git push
```

Then merge. CI on `main` refuses an unsigned or outdated list.

### The signing key

Created once with `node scripts/new-signing-key.mjs`. The private key stays on the
maintainer's computer (`~/.marky/plugins-signing.key`), never in git; back it up somewhere
safe. Losing it means a new key and a Marky release that trusts the new key before the list
can be signed again.
