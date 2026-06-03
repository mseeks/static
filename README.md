# static — drop-and-share static pages on zo-k8s

A dead-simple way to publish arbitrary static HTML to **https://static.mseeks.me**.
Drop a file in [`public/`](public/), push, redeploy. No build step, no framework —
the files **are** the artifact, served by a bare nginx.

## Publish a page

1. Add your file to `public/`, e.g. `public/cool-thing.html` (subfolders work too:
   `public/demos/widget.html`).
2. Commit to `main`. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))
   builds and pushes `ghcr.io/mseeks/static:latest`.
3. Redeploy the cluster workload — from the **zo** workspace:
   ```sh
   infra/k8s/static/install.sh
   ```
4. It's live:
   - your page → `https://static.mseeks.me/cool-thing.html`
   - the root `/` **auto-lists** everything published (autoindex), so you never
     have to maintain an index.

Want a curated landing page instead of the auto-listing? Drop a
`public/index.html` — nginx serves it in preference to the directory listing.

## How it's wired

- **Image** — `ghcr.io/mseeks/static:latest`, built by this repo's CI on push to
  `main` (a plain `docker build` of [`Dockerfile`](Dockerfile) — nginx + the
  contents of `public/`). The GHCR package is **public**, so the cluster needs no
  pull secret.
- **Serving** — nginx ([`nginx.conf`](nginx.conf)): `autoindex on` for the root
  listing, gzip on text, `Cache-Control: no-cache` on responses (you redeploy the
  same filename with new content, so HTML must not be cached hard), and a
  `/healthz` endpoint for the k8s probes.
- **Deploy / Ingress / TLS** — lives in the zo workspace at `infra/k8s/static/`
  (namespace + Deployment + Service + Ingress), behind ingress-nginx with a
  Let's Encrypt cert. The build belongs here with the source; the deployment
  points *outward* at this public image.

## Local preview

```sh
docker build -t static-local . && docker run --rm -p 8080:80 static-local
# open http://localhost:8080/
```
