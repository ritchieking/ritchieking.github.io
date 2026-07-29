/* Build-time extractor for the homepage's native project teasers.
   Loads each rescued project locally in headless chromium, lets its own JS
   render, then extracts just the component the homepage embeds — so the
   teasers stay pixel-faithful to the archived projects without iframes.

   Usage:
     python3 -m http.server 8123   (from a dir where / is the homepage and
                                    /redistricting-maps/ etc. are the projects)
     PW_DIR=<dir containing node_modules/playwright-core> node scripts/build-embeds.mjs

   Writes fragments into embeds/. Commit the results; this only needs
   rerunning if the archived projects themselves change. */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(
  process.env.PW_DIR ? process.env.PW_DIR + "/" : import.meta.url
);
const { chromium } = require("playwright-core");

const BASE = process.env.EMBED_BASE || "http://localhost:8123";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "embeds");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
});

/* ---- Atlas of Redistricting: seat-split summary table ----
   The waffle strips are the project's own pre-baked PNGs; the counts and
   expected-seat numbers are filled in by its JS from embedded data and
   never change, so we read the populated DOM once and emit a static
   fragment that <img>-references the project's images. */
async function atlas() {
  const page = await ctx.newPage();
  await page.goto(BASE + "/redistricting-maps/", { waitUntil: "networkidle" });
  await page.waitForSelector(".histogram .rank-row .table-labels", {
    timeout: 15000,
  });
  const data = await page.evaluate(() => {
    const rows = [];
    document
      .querySelectorAll(".histogram .power-table tbody tr.rank-row")
      .forEach((tr) => {
        const cls = [...tr.classList].find((c) => c.endsWith("-row") && c !== "rank-row");
        rows.push({
          maptype: cls.replace(/-row$/, ""),
          name: tr.querySelector("td.name").textContent.trim(),
          counts: [...tr.querySelectorAll(".table-labels .count")].map((s) =>
            s.textContent.trim()
          ),
          img: tr.querySelector("td.power img").getAttribute("src"),
          dem: tr.querySelector("td.dem").textContent.trim(),
          gop: tr.querySelector("td.gop").textContent.trim(),
          highlight: tr.classList.contains("rank-highlight"),
        });
      });
    const heads = [...document.querySelectorAll(".histogram .top-header th, .histogram .bottom-header th")]
      .map((th) => th.textContent.trim());
    return { rows, heads };
  });
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  // Pin the competitive count above its segment: the strips are unit charts
  // reading left to right (Dem, competitive, GOP), so the segment's center
  // is (dem + comp/2) / total of the way across. The seat-split columns are
  // dropped so the table fits the side-by-side feature layout.
  const row = (r) => {
    const n = r.counts.map(Number);
    const mid = ((n[0] + n[1] / 2) / (n[0] + n[1] + n[2])) * 100;
    return `      <tr class="ae-row${r.highlight ? " ae-hl" : ""}">
        <td class="ae-name">${esc(r.name)}</td>
        <td class="ae-bar">
          <div class="ae-counts"><span class="ae-c-dem">${r.counts[0]}</span><span class="ae-c-comp" style="left:${mid.toFixed(1)}%">${r.counts[1]}</span><span class="ae-c-gop">${r.counts[2]}</span></div>
          <img src="${r.img.replace(/\?.*$/, "")}" alt="District partisan breakdown: ${esc(r.name)}" loading="lazy" />
        </td>
      </tr>`;
  };
  const html = `<table class="ae-table">
      <thead>
        <tr class="ae-h2">
          <th class="ae-name">Map</th>
          <th class="ae-bar"><span>Usually Dem. districts</span><span>Highly competitive</span><span>Usually Republican</span></th>
        </tr>
      </thead>
      <tbody>
${data.rows.map(row).join("\n")}
      </tbody>
    </table>`;
  writeFileSync(join(OUT, "atlas.html"), html + "\n");
  console.log("atlas.html written,", data.rows.length, "rows");
  console.log("header cells seen:", JSON.stringify(data.heads));
  await page.close();
}

/* ---- p-hacking: the scatterplot, rendered large ----
   The chart is runtime d3 SVG with no hover behavior, so a static copy is a
   faithful one. The app picks a random almost-significant result per load;
   we reload until we get a Democratic (blue) one so the fragment is stable
   and then re-render wider than the cramped in-page 428px column. */
async function phack() {
  const CHART_W = 720;
  const CHART_H = 480;
  for (let attempt = 0; attempt < 20; attempt++) {
    const page = await ctx.newPage();
    await page.goto(BASE + "/p-hacking/", { waitUntil: "networkidle" });
    await page.waitForSelector("#chart svg circle.dot", { timeout: 15000 });
    const isBlue = await page.evaluate(() => {
      const dot = document.querySelector("#chart svg circle.dot");
      return getComputedStyle(dot).fill.replace(/ /g, "") === "rgb(0,143,213)";
    });
    if (!isBlue) {
      await page.close();
      continue;
    }
    // Widen the chart column and re-trigger the app's own resize redraw.
    // Chart height = #terms height minus the section-read block, so pad
    // #terms to hit the height we want (falls back to a square otherwise).
    await page.evaluate(
      ([w, h]) => {
        const style = document.createElement("style");
        style.textContent = `.container .seven.columns.second-col{width:${w}px !important}
           #chart{width:${w}px !important;margin-left:0 !important}`;
        document.head.appendChild(style);
        const read = document.querySelector(".second-col .section-read");
        const readBox = read.getBoundingClientRect();
        const mb = parseFloat(getComputedStyle(read).marginBottom);
        document.querySelector("#terms").style.height =
          h + readBox.height + mb + 9 + "px";
        window.onresize();
      },
      [CHART_W, CHART_H]
    );
    await page.waitForTimeout(400);
    let svg = await page.evaluate(() => {
      const el = document.querySelector("#chart svg");
      const w = +el.getAttribute("width");
      const h = +el.getAttribute("height");
      el.setAttribute("viewBox", `0 0 ${w} ${h}`);
      el.removeAttribute("width");
      el.removeAttribute("height");
      el.setAttribute("preserveAspectRatio", "xMidYMid meet");
      return el.outerHTML;
    });
    // a little more visual weight at teaser scale, and trim float precision
    svg = svg.replace(/circle class="dot" r="3.5"/g, 'circle class="dot" r="4.5"');
    svg = svg.replace(/\d+\.\d{2,}/g, (m) => (+(+m).toFixed(1)).toString());
    writeFileSync(join(OUT, "phack.svg"), svg + "\n");
    console.log(`phack.svg written (attempt ${attempt + 1}), ${svg.length} bytes`);
    await page.close();
    return;
  }
  throw new Error("p-hacking: never drew a Democratic chart in 20 loads");
}

/* ---- 2016 forecast: "Chance of winning" bar + national map ----
   The bar is plain HTML with an inline-gradient div; the map SVG has state
   colors baked in as inline fills and ready-made .hover-border overlays.
   Both copy out verbatim. Tooltip HTML per state is captured by firing the
   page's own mouseover handlers (which render its Jade template), so the
   homepage only needs show/hide/position logic. */
async function forecast() {
  const page = await ctx.newPage();
  await page.goto(BASE + "/2016-election-forecast/", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('div[data-card-id="US-racemap"] svg .state', {
    timeout: 20000,
  });
  // the app repaints the prerendered map at boot; wait until every state in
  // the card we capture carries its inline fill
  await page.waitForFunction(
    () => {
      const card = document.querySelector('div[data-card-id="US-racemap"]');
      const paths = card
        ? card.querySelectorAll(".states path.state")
        : [];
      return (
        paths.length > 45 &&
        [...paths].every((p) =>
          (p.getAttribute("style") || "").includes("fill")
        )
      );
    },
    { timeout: 20000 }
  );
  await page.waitForTimeout(800);
  const data = await page.evaluate(() => {
    const bar = document.querySelector(
      'div[data-card-id="US-winprob-sentence"]'
    );
    const map = document.querySelector('div[data-card-id="US-racemap"]');
    const tips = {};
    const inner = document.querySelector("#map-tooltip .tooltip-inner");
    // scope to the captured card: the page holds a second, listener-less
    // copy of the map whose paths would re-read stale tooltip content
    map.querySelectorAll(".states path.state").forEach((path) => {
      const abbr = path.getAttribute("class").replace("state ", "").trim();
      path.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      if (inner && inner.innerHTML.trim()) {
        tips[abbr] = {
          html: inner.innerHTML,
          name: (inner.querySelector("h6") || {}).textContent || abbr,
        };
      }
      path.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    });
    return { bar: bar.outerHTML, map: map.outerHTML, tips };
  });
  const slug = (name) =>
    name
      .replace(/ statewide$/i, "") // "Maine statewide" page dir is maine/
      .toLowerCase()
      .replace(/[^a-z ]/g, "")
      .trim()
      .replace(/ +/g, "-");
  const tipsOut = {};
  for (const [abbr, t] of Object.entries(data.tips)) {
    tipsOut[abbr] = { html: t.html, href: "2016-election-forecast/" + slug(t.name) + "/" };
  }
  // The app ships duplicate per-state border overlays for hover/selection
  // (~260KB). Drop both; the homepage clones the hovered state's own path
  // data into one reusable outline at runtime instead.
  let map = data.map
    .replace(/<g[^>]*class="highlight-borders"[^>]*>.*?<\/g>/s, "")
    .replace(/<g[^>]*class="hover-borders"[^>]*>.*?<\/g>/s, "");
  if (/highlight-borders|hover-borders/.test(map)) {
    throw new Error("forecast: border overlay strip failed");
  }
  // Trim sub-pixel precision in path/transform coordinates.
  map = map.replace(/\d+\.\d{2,}/g, (m) => (+(+m).toFixed(1)).toString());
  let html =
    '<div class="fe-bar">' +
    data.bar +
    '</div>\n<div class="fe-map">' +
    map +
    "</div>\n" +
    '<script type="application/json" class="fe-tips">' +
    JSON.stringify(tipsOut).replace(/</g, "\\u003c") +
    "</script>";
  html = html.replace(/<a id="map"><\/a>/g, "");
  writeFileSync(join(OUT, "forecast.html"), html + "\n");
  console.log(
    "forecast.html written,",
    Object.keys(tipsOut).length,
    "state tooltips,",
    html.length,
    "bytes"
  );
  await page.close();
}

/* ---- flights: the tilted result-card stack, BOS→ORD selected ----
   Drives the real app's typeahead so its own Backbone views render the
   nation/terminal/route stack, then captures it. A data island with the
   default route's per-airline times powers the hover crosshair; picking a
   different route re-renders live in js/teasers.js. */
async function flights() {
  const page = await ctx.newPage();
  await page.goto(BASE + "/flights/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const pick = async (placeholder, code) => {
    const input = page.locator(`input.tt-input[placeholder="${placeholder}"]`);
    await input.click();
    await input.type(code, { delay: 40 });
    await page.waitForTimeout(350);
    await page.locator(".tt-suggestion").first().click();
    await page.waitForTimeout(400);
  };
  await pick("Leaving From", "BOS");
  await pick("Flying To", "ORD");
  await page.waitForSelector("#results .route-container svg", {
    timeout: 10000,
  });
  let stack = await page.evaluate(
    () => document.querySelector("#results").innerHTML
  );
  stack = stack
    .replace(/ id="chart-container"/g, ' class="chart-container"')
    .replace(/ id="hover-rect"/g, ' class="hover-rect"')
    .replace(/ class="cards ([^"]*)hide-mobile([^"]*)"/g, ' class="cards $1$2"');

  // Default-route hover data, formatted the way the app formats it.
  // sibling checkout of the flights project repo
  const routes = require(join(
    dirname(fileURLToPath(import.meta.url)),
    "../../flights/data/routes.json"
  ));
  const fmt = (min) => {
    const r = Math.round(Math.abs(min));
    return Math.floor(r / 60) + ":" + String(r % 60).padStart(2, "0");
  };
  const rows = Object.values(routes.BOS.ORD)
    .sort((a, b) => a.actual_time - b.actual_time)
    .map((d) => ({ airline: d.airline, sched: fmt(d.scheduled_time), act: fmt(d.actual_time) }));
  const island =
    '<script type="application/json" class="fl-default">' +
    JSON.stringify({ origin: "BOS", dest: "ORD", rows }).replace(/</g, "\\u003c") +
    "</script>";
  writeFileSync(
    join(OUT, "flights.html"),
    '<div class="fl-stack">' + stack + "</div>\n" + island + "\n"
  );
  console.log("flights.html written,", stack.length, "bytes of stack");
  await page.close();
}

const targets = process.argv.slice(2);
const all = { atlas, phack, forecast, flights };
for (const [name, fn] of Object.entries(all)) {
  if (targets.length && !targets.includes(name)) continue;
  await fn();
}
await browser.close();
