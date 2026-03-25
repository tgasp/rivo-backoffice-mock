# Deployment

Each backoffice app can be deployed as its own Railway service with its own Dockerfile:

- `admin`: `Dockerfile.admin`
- `cms`: `Dockerfile.cms`
- `config-admin`: `Dockerfile.config-admin`

All three images:

- build only the target app plus shared workspace packages
- serve static assets with `nginx`
- support SPA routing with `index.html` fallback
- read runtime environment from container variables through `/env.js`

Required environment variables per Railway service:

```env
PORT=8080
VITE_API_BASE_URL=https://your-api.example.com
VITE_APP_ENV=production
```

Recommended Railway setup:

1. Create one Railway service per app.
2. Point each service to the same repo.
3. Set the Dockerfile path to the matching file:
   - `Dockerfile.admin`
   - `Dockerfile.cms`
   - `Dockerfile.config-admin`
4. Set service-specific variables like `VITE_API_BASE_URL`.

Example local builds:

```bash
docker build -f Dockerfile.admin -t backoffice-admin .
docker build -f Dockerfile.cms -t backoffice-cms .
docker build -f Dockerfile.config-admin -t backoffice-config-admin .
```

Example local runs:

```bash
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e VITE_API_BASE_URL=http://host.docker.internal:3100 \
  -e VITE_APP_ENV=production \
  backoffice-cms
```
