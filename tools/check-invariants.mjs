// Lean static invariants for the frontend. No dependencies.
// Usage: node tools/check-invariants.mjs
//
// The core is exported and takes read/exists functions so the exact same
// logic can be exercised without a checkout (for example in a browser test
// harness with a stubbed file map).

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function checkInvariants(read, exists) {
  const failures = [];
  const check = (label, ok, detail = "") => {
    if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
  };

  const html = read("index.html");
  const appJs = read("app.js");
  const sw = read("service-worker.js");

  // 1. Exactly one asset version across html, app.js, and the service worker.
  const versionRefs = [];
  for (const [label, text] of [["index.html", html], ["app.js", appJs], ["service-worker.js", sw]]) {
    for (const match of text.matchAll(/\?v=(\d+)/g)) {
      versionRefs.push({ label, version: match[1] });
    }
  }
  const versions = [...new Set(versionRefs.map((ref) => ref.version))];
  check("asset version is consistent", versions.length === 1, `saw ${JSON.stringify(versions)}`);
  const version = versions[0];

  const cacheName = sw.match(/CACHE_NAME = "circuit-timer-v(\d+)"/);
  check(
    "service worker cache name matches asset version",
    Boolean(cacheName) && cacheName[1] === version,
    cacheName ? `cache v${cacheName[1]} vs assets v${version}` : "CACHE_NAME pattern missing",
  );

  // 2. The entry points reference the versioned assets.
  for (const asset of ["styles.css", "ai-config.js", "app.js"]) {
    check(`index.html loads ./${asset}?v=${version}`, html.includes(`./${asset}?v=${version}`));
  }
  check(
    `app.js registers ./service-worker.js?v=${version}`,
    appJs.includes(`./service-worker.js?v=${version}`),
  );

  // 3. Every precached file exists, and versioned entries use the current version.
  const listMatch = sw.match(/const APP_FILES = \[([\s\S]*?)\];/);
  check("service worker has an APP_FILES list", Boolean(listMatch));
  const precache = listMatch ? [...listMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
  for (const entry of precache) {
    const [path, query] = entry.replace(/^\.\//, "").split("?");
    const file = path === "" ? "index.html" : path;
    check(`precached file exists: ${entry}`, exists(file));
    if (query) {
      const queryMatch = query.match(/^v=(\d+)$/);
      check(`precache version on ${path}`, Boolean(queryMatch) && queryMatch[1] === version);
    }
  }
  for (const required of ["index.html", "styles.css", "app.js", "manifest.webmanifest"]) {
    check(
      `precache covers ${required}`,
      precache.some((entry) => entry === `./${required}` || entry.startsWith(`./${required}?`)),
    );
  }

  // 4. Manifest icons exist and cover the sizes/purposes installability needs.
  const manifest = JSON.parse(read("manifest.webmanifest").replace(/^\uFEFF/, ""));
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  check("manifest declares icons", icons.length > 0);
  for (const icon of icons) {
    check(`manifest icon exists: ${icon.src}`, exists(String(icon.src).replace(/^\.\//, "")));
  }
  check("manifest has a 192x192 png", icons.some((i) => i.sizes === "192x192" && i.type === "image/png"));
  check("manifest has a 512x512 png", icons.some((i) => i.sizes === "512x512" && i.type === "image/png"));
  check(
    "manifest has a maskable png",
    icons.some((i) => i.type === "image/png" && String(i.purpose || "").split(/\s+/).includes("maskable")),
  );

  // 5. apple-touch-icon must be a png; iOS ignores the svg favicon.
  const touch = html.match(/<link rel="apple-touch-icon" href="\.\/([^"]+)"/);
  check("apple-touch-icon link present", Boolean(touch));
  if (touch) {
    check("apple-touch-icon is a png", touch[1].endsWith(".png"), touch[1]);
    check("apple-touch-icon file exists", exists(touch[1]));
  }

  // 6. Every element id app.js looks up must exist in index.html.
  const htmlIds = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
  const jsIdRefs = new Set();
  for (const match of appJs.matchAll(/querySelector\(\s*"#([A-Za-z][\w-]*)"\s*\)/g)) jsIdRefs.add(match[1]);
  for (const match of appJs.matchAll(/getElementById\(\s*"([^"]+)"\s*\)/g)) jsIdRefs.add(match[1]);
  check("app.js queries at least one element id", jsIdRefs.size > 0);
  for (const id of jsIdRefs) {
    check(`#${id} exists in index.html`, htmlIds.has(id));
  }

  // 7. Clearing an AI workout must restore the manual timer settings captured at load.
  const loadFn = appJs.match(/function loadAIPlanIntoTimer\(\) \{[\s\S]*?\n\}/);
  const clearFn = appJs.match(/function clearAIPlan\(\) \{[\s\S]*?\n\}/);
  check("loadAIPlanIntoTimer found", Boolean(loadFn));
  check("clearAIPlan found", Boolean(clearFn));
  if (loadFn) {
    const captureAt = loadFn[0].indexOf("state.preAiManualSettings = {");
    const overwriteAt = loadFn[0].indexOf("workInput.value = String(state.plan.workSeconds)");
    check(
      "AI load captures manual settings before applying plan values",
      captureAt !== -1 && overwriteAt !== -1 && captureAt < overwriteAt,
    );
  }
  if (clearFn) {
    const restoreAt = clearFn[0].indexOf("workInput.value = state.preAiManualSettings.work");
    const saveAt = clearFn[0].lastIndexOf("saveSettings()");
    check("AI clear restores captured manual settings", restoreAt !== -1);
    check("AI clear restores before saving settings", restoreAt !== -1 && saveAt !== -1 && restoreAt < saveAt);
  }

  return failures;
}

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const failures = checkInvariants(
    (rel) => readFileSync(join(root, rel), "utf8"),
    (rel) => existsSync(join(root, rel)),
  );
  if (failures.length > 0) {
    console.error(`Invariant check failed (${failures.length}):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log("All static invariants passed.");
}
