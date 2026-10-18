# A versão do pg_dump precisa ser >= à do Postgres do Neon (confira com SELECT version()).
FROM postgres:17-alpine
RUN apk add --no-cache aws-cli
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
