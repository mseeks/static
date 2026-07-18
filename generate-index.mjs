// Build-time stand-in for nginx's `autoindex`: Vercel has no directory
// listings, so this walks public/ and writes an index.html into every
// directory that doesn't own a real page, listing its entries (dirs first,
// then files, with sizes and last-commit dates). Runs as the Vercel
// buildCommand; run locally only to preview (outputs are gitignored — don't
// commit them). Generated listings carry a MARKER meta tag so re-runs can
// tell them from committed pages (e.g. review/vibe-themer/index.html, which
// is left alone, children and all).
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

const ROOT = "public";
const MARKER = '<meta name="generator" content="generate-index.mjs">';

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

// Vercel clones --depth=10, and in a shallow clone `git log -1 -- <path>`
// reports the truncation boundary for anything older — a wrong date that
// drifts forward with every push. Deepen once if the remote allows it;
// lastTouched() degrades boundary hits to "—" if we're still shallow.
let shallow = false;
try {
  shallow = git("rev-parse", "--is-shallow-repository") === "true";
  if (shallow) {
    execFileSync("git", ["fetch", "--quiet", "--unshallow"], { stdio: "ignore" });
    shallow = false;
  }
} catch {
  // not a git checkout, or the fetch failed — dates degrade below
}

// Last-commit date for an entry. Clone mtimes are just checkout time, so git
// is the only meaningful source; mtime covers untracked files and non-git
// runs. `%p` (parent hashes) tells a boundary commit apart: parentless in a
// still-shallow clone means "history truncated here", so admit ignorance.
function lastTouched(path) {
  try {
    const out = git("log", "-1", "--format=%cs %p", "--", path);
    if (out) {
      const [date, ...parents] = out.split(" ");
      if (shallow && parents.length === 0) return "—";
      return date;
    }
  } catch {
    // fall through to mtime
  }
  try {
    return statSync(path).mtime.toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// A directory is "owned" when it has an index.html we didn't generate.
function ownsRealIndex(dir) {
  const p = join(dir, "index.html");
  if (!existsSync(p)) return false;
  try {
    return !readFileSync(p, "utf8").includes(MARKER);
  } catch {
    return true; // unreadable — treat as owned, never overwrite
  }
}

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
    const href = encodeURIComponent(e.name) + (e.isDirectory() ? "/" : "");
    const label = esc(e.name) + (e.isDirectory() ? "/" : "");
    const size = e.isDirectory() ? "-" : fmtSize(statSync(p).size);
    return `<tr><td><a href="${href}">${label}</a></td><td>${size}</td><td>${lastTouched(p)}</td></tr>`;
  });
  const up =
    here === "/" ? "" : `<tr><td><a href="../">../</a></td><td></td><td></td></tr>`;

  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html><meta charset="utf-8">${MARKER}<title>Index of ${esc(here)}</title>
<style>body{font:14px/1.6 monospace;margin:2rem}td{padding:0 1.5rem 0 0}</style>
<h1>Index of ${esc(here)}</h1><table>${up}${rows.join("")}</table>\n`,
  );

  for (const e of entries) if (e.isDirectory()) descend(join(dir, e.name));
}

function descend(dir) {
  if (ownsRealIndex(dir)) return; // a real page owns this dir — leave it whole
  writeListing(dir);
}

descend(ROOT);
console.log("directory indexes generated under", ROOT);
