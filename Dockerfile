# The website image: the built React app inside a Caddy that also forwards /api and /files to the API.
# Build the site first (the workflow does it):  VITE_API_URL=/api/v1 npm run build   → ./dist
# Copy this file and Caddyfile to the root of the frontend repo.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY dist /srv
