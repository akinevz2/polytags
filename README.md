# polytags

kine's polybar workspace labels for herbstluftwm — a native binary via
bunli, and a drop-in replacement for the polybar package's `ewmh_labels`
bash script. It renders the workspace label line for
`[module/workspaces]`-style modules (one line, `tail = true`) and handles
the bar's click and scroll actions.

## Install

The package's `bin` entry is a TypeScript source (`src/index.ts`).
Install and run it with bun:

```sh
git clone https://github.com/akinevz2/polytags ./polytags
cd ./polytags
bun install
bunx polytags --once   # one-shot render through bun's runtime
```

> **Note:** use bun or bunx, not npx — npx does not handle the
> TypeScript `bin` sources correctly.

For a standalone binary (the form the dots deployment uses), build it
with bunli:

```sh
make build            # bunli build -> dist/polytags
```

The dots repo owns placement: the package adapter
(`dots/polytags/.local/share/depends/polytags/Makefile`) folds the
artifact into `dots/polytags/.local/bin/polytags` and stow ships it to
`~/.local/bin/polytags`. Nothing in this Makefile installs to `$HOME`.

## What it does

Byte-for-byte the `ewmh_labels` lifecycle, in TypeScript:

- **Bar daemon** — bare invocation renders the label line once, then
  re-renders on every hlwm hook (`herbstclient --idle`; single writer,
  no polling). `quit_panel`/`reload` terminate it — polybar's
  `tail = true` contract.
- **Click / scroll** — left click switches to the tag, scroll cycles
  prev/next with wraparound (`%{A}` action strings).
- **Styling** — populated workspaces bright gray, empty dimmed, the
  focused tag gets the gold underline.
- **Max shadows** — a `<base>-max` tag renders in the base's slot
  (the `hc_maximize` convention); the base only appears beside it
  while scrolled onto.

`--once` prints one line and exits; `polytags render` is the same via
the bunli command tree; `polytags --help` for the surface.

## Build

The compiled artifact is a `bun build --compile` product (~120 MB —
it embeds the Bun runtime and needs nothing else at runtime).

```sh
bun install
make build           # bunli build -> dist/polytags
```

## Dependencies

None at runtime beyond `herbstclient` — the binary shells out to
`herbstclient` for `tag_status`, `tags.focus.index` and `--idle`.

## Test

`bun test` covers the parser, the label emitter and the max-shadow
logic against recorded tag_status lines — nothing needs a live WM.

## License

MIT
