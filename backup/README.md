# Backup diário do banco (Cloudflare R2)

Uma máquina agendada no Fly roda `pg_dump` do Neon uma vez por dia e envia o arquivo para um bucket no Cloudflare R2, com o nome `planner/AAAA-MM-DD.dump`. O R2 apaga sozinho os arquivos com mais de 30 dias.

## Configurar (uma vez)

1. **Cloudflare R2**
   - Crie um bucket, por exemplo `planner-backups`.
   - Em *R2 → Manage R2 API Tokens*, crie um token com permissão **Object Read & Write** só nesse bucket. Guarde o *Access Key ID*, o *Secret Access Key* e o *Account ID*.
   - No bucket, em *Settings → Object lifecycle rules*, crie uma regra: prefixo `planner/`, **Delete objects after 30 days**.

2. **Versão do Postgres**: no console do Neon, rode `SELECT version();`. Se for maior que 18, troque `postgres:18-alpine` no `Dockerfile` pela versão correspondente.

3. **Fly** (dentro desta pasta `backup/`):
   ```bash
   fly apps create planner-backup
   fly secrets set --app planner-backup \
     DATABASE_URL="postgresql://...neon.../planner?sslmode=require" \
     R2_BUCKET="planner-backups" \
     R2_ACCOUNT_ID="<account id>" \
     AWS_ACCESS_KEY_ID="<access key id do token R2>" \
     AWS_SECRET_ACCESS_KEY="<secret do token R2>"
   fly machine run . --app planner-backup --schedule daily --restart no
   ```

4. No dia seguinte, confira no painel do R2 se o arquivo `planner/AAAA-MM-DD.dump` apareceu. Para rodar na hora: `fly machine start <id> --app planner-backup` (o id aparece em `fly machine list --app planner-backup`).

Se o dump ou o envio falharem, o script termina com erro e nada é enviado. Os logs ficam em `fly logs --app planner-backup`.

## Restaurar

De preferência, restaure primeiro num **branch novo do Neon**, confira os dados e só então aponte o app para ele.

```bash
aws s3 cp s3://planner-backups/planner/2026-10-18.dump ./planner.dump \
  --endpoint-url https://<account id>.r2.cloudflarestorage.com
pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" planner.dump
```

(`aws` usa as mesmas chaves do token R2 em `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`, com `AWS_DEFAULT_REGION=auto`.)

## Testar localmente

O script aceita `R2_ENDPOINT` para apontar para qualquer serviço compatível com S3 (foi testado assim, com o `adobe/s3mock`):

```bash
docker build -t planner-backup .
docker run --rm -e DATABASE_URL=... -e R2_BUCKET=... -e R2_ENDPOINT=http://host.docker.internal:9100 \
  -e AWS_ACCESS_KEY_ID=... -e AWS_SECRET_ACCESS_KEY=... planner-backup
```
