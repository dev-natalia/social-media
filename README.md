# Planner Social

App para planejar posts de redes sociais de vários clientes: planner semanal colorido por tipo de conteúdo, visões mensal e diária, status, checklist, datas importantes e feriados nacionais (BrasilAPI). Funciona no navegador e pode ser instalado no celular (PWA).

- `backend/`: FastAPI, SQLAlchemy e Alembic (Postgres/Neon)
- `frontend/`: React, Vite e TypeScript, com `vite-plugin-pwa`
- `backup/`: cópia diária do banco para o Cloudflare R2
- Design: `docs/superpowers/specs/2026-10-18-planner-social-media-design.md`

## Rodar localmente

Requisitos: Python 3.12+, Node 24, Docker (para o Postgres local).

```bash
docker run -d --name planner-pg -p 5444:5432 -e POSTGRES_PASSWORD=planner -e POSTGRES_DB=planner postgres:17
```

Em `backend/.env`:

```
DATABASE_URL=postgresql://postgres:planner@localhost:5444/planner
SECRET_KEY=qualquer-coisa-local
```

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -e ".[dev]"      # no Linux/mac: .venv/bin/pip
.venv/Scripts/alembic upgrade head
.venv/Scripts/python scripts/dev_seed.py   # conta dev@planner.test com clientes de exemplo (só banco local)
.venv/Scripts/uvicorn --factory app.main:create_app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (encaminha /api para a porta 8000)
```

A senha da conta de desenvolvimento está em `backend/scripts/dev_seed.py`.

## Testes

```bash
cd backend && .venv/Scripts/python -m pytest -q
cd frontend && npm test
```

Para rodar os testes do backend contra um Postgres de verdade: `TEST_DATABASE_URL=postgresql://... pytest -q` (use um banco vazio só para testes, porque as tabelas são recriadas).

## Deploy no Fly.io

1. `fly launch --no-deploy` (aproveite o `fly.toml` do repositório e ajuste o nome do app).
2. Secrets:
   ```bash
   fly secrets set DATABASE_URL="postgresql://...neon.../planner?sslmode=require" SECRET_KEY="$(python -c 'import secrets;print(secrets.token_urlsafe(48))')"
   ```
3. `fly deploy`. As migrações rodam sozinhas (`release_command = "alembic upgrade head"`).
4. Criar a conta de admin:
   ```bash
   fly ssh console -C "python -m app.cli create-admin seu@email.com"
   ```
5. No celular, abra o site e use "Adicionar à tela inicial" (Android: o Chrome também oferece "Instalar app").

As outras contas são criadas pela admin na tela **Usuários**. Não existe cadastro aberto nem recuperação de senha por e-mail: a admin redefine a senha na mesma tela.

## Backup e restauração

Veja `backup/README.md`.
