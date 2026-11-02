#!/bin/sh
# Respaldo nocturno: copia completa de la base (Neon) comprimida, subida a Cloud Storage.
# Corre como Cloud Run Job; el bucket guarda versiones y borrado suave de 30 días.
set -eu

FECHA=$(date -u +%Y-%m-%d_%H%M)
ARCHIVO="/tmp/gimnasio_${FECHA}.sql.gz"

pg_dump "$DATABASE_URL" --no-owner --no-privileges --quote-all-identifiers | gzip -9 > "$ARCHIVO"

# Un respaldo sin la tabla de auditoría está incompleto: mejor fallar y que se note.
gunzip -c "$ARCHIVO" | grep -q 'CREATE TABLE "public"."auditoria"' || { echo "Respaldo incompleto"; exit 1; }

TOKEN=$(curl -sf -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" | sed 's/.*"access_token":"\([^"]*\)".*/\1/')

curl -sf -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/gzip" \
  --data-binary @"$ARCHIVO" \
  "https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=neon/gimnasio_${FECHA}.sql.gz" > /dev/null

echo "Respaldo subido: gs://${BUCKET}/neon/gimnasio_${FECHA}.sql.gz ($(du -h "$ARCHIVO" | cut -f1))"
