#!/bin/sh
# Faz pg_dump do banco e envia para o Cloudflare R2 (API compatível com S3).
# Variáveis: DATABASE_URL, R2_BUCKET, R2_ACCOUNT_ID, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# Opcional: R2_ENDPOINT (padrão: https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com), BACKUP_PREFIX (padrão: planner)
set -eu

: "${DATABASE_URL:?defina DATABASE_URL}"
: "${R2_BUCKET:?defina R2_BUCKET}"
: "${AWS_ACCESS_KEY_ID:?defina AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY:?defina AWS_SECRET_ACCESS_KEY}"

ENDPOINT="${R2_ENDPOINT:-https://${R2_ACCOUNT_ID:?defina R2_ACCOUNT_ID}.r2.cloudflarestorage.com}"
PREFIX="${BACKUP_PREFIX:-planner}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"

STAMP="$(date -u +%Y-%m-%d)"
FILE="/tmp/planner-${STAMP}.dump"

echo "Gerando dump..."
pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$FILE"
SIZE="$(wc -c < "$FILE")"

echo "Enviando ${SIZE} bytes para s3://${R2_BUCKET}/${PREFIX}/${STAMP}.dump"
aws s3 cp "$FILE" "s3://${R2_BUCKET}/${PREFIX}/${STAMP}.dump" --endpoint-url "$ENDPOINT" --only-show-errors

rm -f "$FILE"
echo "Backup concluído."
