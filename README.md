# Marky plugins

The plugin directory for [Marky](https://github.com/michaelkloprogge-gif/marky-releases), a Markdown editor. Marky shows these plugins under **Manage plugins… › Browse**.

Every plugin runs in Marky's sandbox: it has no network or file access and only the permissions it lists, which Marky shows you before installing. Marky also checks each download against the SHA-256 recorded in `index.json` and refuses one that doesn't match.

## Adding a plugin

1. Put the plugin (one `.js` file with a `/* marky-plugin {...} */` header; see Marky's plugin guide) in `plugins/`.
2. Run `node scripts/plugin-index.mjs <this folder>` from the Marky repository to update `index.json`.
3. Commit both files.
