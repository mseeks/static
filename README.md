# static

A personal static server site. Drop files into `public/` and they're served by
nginx; the root `/` lists whatever's there.

## Local preview

```sh
docker build -t static-local . && docker run --rm -p 8080:80 static-local
# open http://localhost:8080/
```
