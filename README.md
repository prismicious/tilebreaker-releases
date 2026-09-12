# Tilebreaker

**[Play it in your browser](https://prismicious.github.io/tilebreaker-releases/)**
-- nothing to download, nothing to install. Open it, click the first node in the
tree, and the run starts.

A blockbreaker with no paddle. The field starts as one solid pastel slab with a
2x2 pocket carved in the middle of it, and nothing in the pocket: a run opens on
the skill tree, and the first thing in the tree is the first ball. It is free,
because a field with no ball in it earns nothing. Buying it is what starts the
game.

Every tile a ball hits is gone for good, so the room you are trapped in becomes
the room you play in. Clear the field and the game does not end -- the camera
pulls back, and the arena you just emptied turns out to have been one small
region in the middle of a much larger one you were already standing in. Four
arenas, each twice as wide and twice as tall as the last, ending at 1792 by 1008
cells.

## Downloads

The **[Releases](../../releases)** page has every tagged version as two zips:

- `tilebreaker-<tag>-web.zip` -- the browser build. Unzip and serve the folder
  over any static HTTP server; it needs no special headers.
- `tilebreaker-<tag>-windows.zip` -- unzip and run `Tilebreaker.exe`. Keep the
  `.pck` file beside it.

## This repository holds builds, not source

There is no code here. The game is built from the private source repository and
published to this one: every push to its `master` rebuilds the playable link
above, and every version tag cuts a release here with both zips attached. Each
build records the source commit it came from in
[`build-info.json`](https://prismicious.github.io/tilebreaker-releases/build-info.json)
beside the game.

Nothing published here is hand-uploaded, and nothing is published that was not
first booted in a headless browser and shown to draw a running game.
