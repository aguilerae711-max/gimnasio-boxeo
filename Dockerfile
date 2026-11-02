# Contenedor para Cloud Run (lo construye Cloud Build; no hace falta Docker en la computadora).
FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS construccion
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS ejecucion
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=construccion --chown=app:app /app/.next/standalone ./
COPY --from=construccion --chown=app:app /app/.next/static ./.next/static
COPY --from=construccion --chown=app:app /app/public ./public
USER app
EXPOSE 8080
CMD ["node", "server.js"]
