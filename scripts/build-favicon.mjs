/* Favicon builder: the site's Fraunces "R" (wght 640, SOFT 50, WONK 1 —
   same axes as the h1) over the marker highlight, on a warm page-colored
   tile. The glyph is converted to an outline path so no font loading is
   involved; the SVG flips light/dark with the tab theme.

   Usage:
     DEPS_DIR=<dir with node_modules/fontkit + playwright-core> \
       node scripts/build-favicon.mjs <path-to-Fraunces[SOFT,WONK,opsz,wght].ttf>

   Writes favicon.svg + PNGs; favicon.ico is assembled by the caller (see
   the python one-liner in the repo history / session notes). */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(
  process.env.DEPS_DIR ? process.env.DEPS_DIR + "/" : import.meta.url
);
const fontkit = require("fontkit");
const { chromium } = require("playwright-core");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fontPath = process.argv[2];
if (!fontPath) throw new Error("pass the Fraunces variable TTF path");

const font = fontkit.openSync(fontPath);
const v = font.getVariation({ wght: 640, opsz: 54, SOFT: 50, WONK: 1 });
const g = v.layout("R").glyphs[0];
const b = g.bbox;
const d = g.path.toSVG();

// scale the glyph into a 64px tile, optically centered
const H = 43; // glyph cap height on the tile, px
const s = H / (b.maxY - b.minY);
const w = (b.maxX - b.minX) * s;
const tx = (64 - w) / 2 - b.minX * s;
const baseline = (64 - H) / 2 + H; // glyph sits from y=12 to y=52
const glyphTransform = `translate(${tx.toFixed(2)},${baseline.toFixed(2)}) scale(${s.toFixed(5)},-${s.toFixed(5)})`;

function svg({ rounded }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    .tile { fill: #faf6ef; }
    .hi { fill: #eda100; fill-opacity: 0.32; }
    .r { fill: #211d19; }
    @media (prefers-color-scheme: dark) {
      .tile { fill: #141210; }
      .hi { fill: #c98500; fill-opacity: 0.35; }
      .r { fill: #f4efe6; }
    }
  </style>
  <rect class="tile" width="64" height="64"${rounded ? ' rx="14"' : ""}/>
  <rect class="hi" x="7" y="25" width="50" height="19" rx="3" transform="skewX(-8) translate(4.6,0)"/>
  <path class="r" transform="${glyphTransform}" d="${d}"/>
</svg>
`;
}

writeFileSync(join(ROOT, "favicon.svg"), svg({ rounded: true }));
console.log("favicon.svg written");

// PNG renders via headless chromium
const browser = await chromium.launch();
async function png(markup, size, out, colorScheme) {
  const ctx = await browser.newContext({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
    colorScheme,
  });
  const page = await ctx.newPage();
  await page.setContent(
    `<style>*{margin:0}body{background:transparent}</style>` +
      markup.replace("<svg ", `<svg width="${size}" height="${size}" `)
  );
  await page.screenshot({ path: out, omitBackground: true });
  await ctx.close();
  console.log(out, "written");
}
await png(svg({ rounded: true }), 32, join(ROOT, "imgs", "favicon-32.png"), "light");
await png(svg({ rounded: true }), 16, join(ROOT, "imgs", "favicon-16.png"), "light");
await png(svg({ rounded: false }), 180, join(ROOT, "imgs", "apple-touch-icon.png"), "light");
await browser.close();
