# Marky plugins

The plugin market for [Marky](https://github.com/michaelkloprogge-gif/marky-releases), a
Markdown editor. Marky shows these plugins under **Manage plugins… › Plugin market**, with
search, categories, details and updates.

| Plugin | Category | What it does |
|---|---|---|
| Bar charts | Data | ```` ```chart ```` blocks as bar charts |
| Calculations | Data | ```` ```calc ```` blocks: sums, named values, totals |
| CSV tables | Data | ```` ```csv ```` blocks as tables |
| Kanban board | Structure | ```` ```kanban ```` blocks as a board |
| Table of contents | Structure | Insert or refresh a linked table of contents |
| QR codes | Other | ```` ```qr ```` blocks as QR codes |
| Readability | Writing | Reading level, reading time and long sentences |
| Emoji shortcodes | Writing | `:smile:` as 😄 in the preview |
| Repeated words | Language | Words you use a lot, and doubles like "the the" |
| Change case | Language | Title Case, Sentence case, UPPER, lower |
| Focus timer | Productivity | A Pomodoro timer in the status bar |
| Word goal | Productivity | A word target with progress in the status bar |

## How it stays safe

- Every plugin runs in Marky's sandbox: no network or file access, and only the permissions
  it lists, which Marky shows before installing (and again, marked, when an update asks for more).
- `index.json` is **signed** (`index.json.sig`, Ed25519) by the maintainer. Marky has the
  public key built in and refuses a list that isn't signed, or was changed after signing.
- Every download is checked against the SHA-256 in the signed list.

## Adding a plugin

See [CONTRIBUTING.md](CONTRIBUTING.md).
