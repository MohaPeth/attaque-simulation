# =============================================================
# Internal Document Portal - Dockerfile
#
# /!\ ATTENTION : configuration VOLONTAIREMENT NON SECURISEE.
#     Le conteneur tourne en root et l'image embarque
#     le client docker pour faciliter la demo de Container Escape.
#     NE PAS UTILISER EN PRODUCTION.
# =============================================================

FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Outils utiles a la demo (curl + client docker pour exploiter docker.sock)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        docker.io \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/uploads

EXPOSE 3000

# Volontairement laisse en root (UID 0)
CMD ["node", "server.js"]
