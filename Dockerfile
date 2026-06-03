# The `static` image: a bare nginx serving whatever lives under public/. No
# build step — the files ARE the artifact. Built and pushed to ghcr.io by CI
# (.github/workflows/ci.yml), deployed to the DOKS cluster (infra/k8s/static in
# the zo workspace) at https://static.mseeks.me.
#
# To publish a page: drop an .html file into public/, commit to main (CI rebuilds
# :latest), then re-run the deploy's install.sh. Nothing secret is baked in.
FROM nginx:1.27-alpine

# Replace the stock server block with ours (autoindex, gzip, /healthz).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Drop the base image's stock index.html/50x.html — otherwise its index.html
# would win over our autoindex listing at "/".
RUN rm -rf /usr/share/nginx/html/*

# The published files. Everything under public/ is served at the site root.
COPY public/ /usr/share/nginx/html/

EXPOSE 80
