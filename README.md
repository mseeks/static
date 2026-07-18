# static

A personal drop-and-share static site. Put a file under `public/`, push
`main`, and it's live at `https://static.mseeks.me/<path>`; the root `/`
(and every directory without a page of its own) lists what's there.

## Serving

Hosted on **Vercel**: a push to `main` deploys production, and pull requests
get preview URLs. [`vercel.json`](./vercel.json) serves `public/` with clean
URLs (`/foo` serves `foo.html` — shared links carry no extension), and
[`generate-index.mjs`](./generate-index.mjs) runs at build time to write the
directory listings nginx's `autoindex` used to render. A directory with its
own committed `index.html` is left alone.

## Local preview

```sh
node generate-index.mjs   # writes gitignored index.html listings
python3 -m http.server 8080 -d public
# open http://localhost:8080/ — extension-less URLs are prod behavior only
```
