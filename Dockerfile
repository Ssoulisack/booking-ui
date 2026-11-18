# The website image: both built React sites inside a Caddy that also forwards /api and /files to the API.
#   :80   the customer website   (dist)
#   :8080 the backoffice         (dist-admin)
# Build the sites first (the workflow does it):  VITE_API_URL=/api/v1 npm run build:all   → ./dist and ./dist-admin
# Copy this file and Caddyfile to the root of the frontend repo.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY dist /srv/web
COPY dist-admin /srv/admin
EXPOSE 80 8080
