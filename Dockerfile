# The static image: a bare nginx serving whatever lives under public/. No build
# step — the files ARE the artifact.
#
# To publish a page: drop a file into public/ and rebuild the image.
FROM nginx:1.27-alpine

# Replace the stock server block with ours (autoindex, gzip, /healthz).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Drop the base image's stock index.html/50x.html so they don't win over our
# autoindex listing at "/".
RUN rm -rf /usr/share/nginx/html/*

# The published files. Everything under public/ is served at the site root.
COPY public/ /usr/share/nginx/html/

EXPOSE 80
