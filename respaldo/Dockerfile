# Imagen del respaldo nocturno. pg_dump debe ser igual o más nuevo que Postgres en Neon (18).
FROM postgres:18-alpine
RUN apk add --no-cache curl
COPY respaldar.sh /respaldar.sh
RUN chmod +x /respaldar.sh
USER postgres
ENTRYPOINT ["/respaldar.sh"]
