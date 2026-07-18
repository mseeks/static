// Build-time stand-in for nginx's `autoindex`: Vercel has no directory
// listings, so this walks public/ and writes an index.html into every
// directory that doesn't already have one, listing its entries (dirs first,
// then files, with sizes and last-commit dates). Runs as the Vercel
// buildCommand; run locally only to preview (the outputs are gitignored —
// don't commit them). A directory with a real, committed index.html (e.g.
// review/vibe-themer/) is left alone.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "public";

// Prefer the file's last-commit date (stable, meaningful); clone mtimes are
// whatever the checkout stamped. Falls back to mtime on shallow-clone misses.
function lastTouched(path) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", path], {
      encoding: "utf8",
    }).trim();
    if (out) return out;
  } catch {
    // not a git checkout (or git absent) — fall through to mtime
  }
  return statSync(path).mtime.toISOString().slice(0, 10);
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function writeListing(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.name !== "index.html" && !e.name.startsWith("."))
    .sort(
      (a, b) =>
        Number(b.isDirectory()) - Number(a.isDirectory()) ||
        a.name.localeCompare(b.name),
    );

  const here = relative(ROOT, dir) || "/";
  const rows = entries.map((e) => {
    const p = join(dir, e.name);
    const href = e.isDirectory() ? `${esc(e.name)}/` : esc(e.name);
    const size = e.isDirectory() ? "-" : fmtSize(statSync(p).size);
    return `<tr><td><a href="${href}">${href}</a></td><td>${size}</td><td>${lastTouched(p)}</td></tr>`;
  });
  const up =
    here === "/" ? "" : `<tr><td><a href="../">../</a></td><td></td><td></td></tr>`;

  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Index of ${esc(here)}</title>
<style>body{font:14px/1.6 monospace;margin:2rem}td{padding:0 1.5rem 0 0}</style>
<h1>Index of ${esc(here)}</h1><table>${up}${rows.join("")}</table>\n`,
  );

  for (const e of entries) if (e.isDirectory()) descend(join(dir, e.name));
}

function descend(dir) {
  if (existsSync(join(dir, "index.html"))) {
    // real page owns this directory; still walk its children? No — a dir
    // with its own index is a self-contained artifact, leave it whole.
    return;
  }
  writeListing(dir);
}

descend(ROOT);
console.log("directory indexes generated under", ROOT);
