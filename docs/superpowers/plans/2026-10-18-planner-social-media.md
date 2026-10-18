# Planner de Mídias Sociais: Plano de Implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** app web instalável (PWA) para planejar posts de vários clientes num planner semanal colorido por tipo de conteúdo, com status, checklist, datas importantes e feriados nacionais.

**Arquitetura:** monorepo com `backend/` (FastAPI e SQLAlchemy sobre Postgres/Neon) e `frontend/` (React, Vite e TypeScript, com PWA). Em produção, um único app no Fly: o FastAPI serve `/api/*` e o build estático do frontend (uma origem só, sem CORS). A sessão fica num cookie assinado. Um job agendado separado faz `pg_dump` diário para o Cloudflare R2.

**Tech stack:** Python ≥3.12, FastAPI, SQLAlchemy 2, Alembic, psycopg 3, Pydantic 2, argon2-cffi, itsdangerous (SessionMiddleware), httpx, pytest. React 18, Vite, TypeScript, react-router-dom 6, vite-plugin-pwa, Vitest e Testing Library. Docker, Fly.io, Neon, Cloudflare R2.

**Spec:** `docs/superpowers/specs/2026-10-18-planner-social-media-design.md`

## Restrições globais

- Banco: Neon (Postgres). Deploy: Fly.io. Backup: cópia diária do banco no Cloudflare R2, guardando 30 dias. Backend em Python.
- Sem overengineering: nenhum serviço extra além de Neon, Fly e R2; sem Redis, fila, storage de arquivos, framework de UI pesado ou gerenciador de estado global.
- Interface toda em **português do Brasil**.
- Semana de **domingo a sábado**.
- Status (valor → rótulo): `a_fazer` → "A fazer", `editando` → "Editando", `agendado` → "Agendado", `postado` → "Postado".
- Checklist com chaves fixas, nesta ordem: `roteiro` "Roteiro", `captacao` "Captação/materiais", `edicao` "Edição/arte", `aprovacao` "Aprovação", `agendamento` "Agendamento". O status e o checklist são independentes.
- Tipos de conteúdo padrão de cada conta nova: Dica `#3b82f6`, Tutorial `#e86a7a`, Bastidores `#4fb06d`, Promoção `#e0b100`, Enquete `#8b5cf6`.
- Redes padrão: Instagram `#e1306c`, TikTok `#111111`, Facebook `#1877f2`, LinkedIn `#0a66c2`, YouTube `#ff0000`.
- Sugestões de formato (texto livre com datalist): Reels, Carrossel, Story, Estático, Vídeo.
- Feriados: `GET https://brasilapi.com.br/api/feriados/v1/{ano}` → `[{date, name, type}]`.
- Logo: o frontend reduz para no máximo 256×256 (WebP) antes de enviar; os bytes ficam no Postgres.
- Cores sempre em `#rrggbb` (validadas no backend).
- Toda consulta é filtrada pelo usuário logado. O recurso de outro usuário responde **404** (não 403).
- Não existe cadastro aberto nem "esqueci a senha". As contas são criadas pela admin.

## Foco de revisão

1. **Data deslocada por fuso:** `new Date("2026-11-02")` vira 1º de novembro às 21h em Brasília. Toda data do app é uma string `YYYY-MM-DD` tratada como data local; nada passa por UTC. Teste na Tarefa 11.
2. **Isolamento entre usuários:** acessar o cliente, post, tipo ou data de outra conta pelo id responde 404 e não altera nada. Testes nas Tarefas 5, 6 e 7.
3. **BrasilAPI fora do ar ou lenta:** o calendário carrega mesmo assim, sem feriados, e a falha **não** fica gravada (a próxima visita tenta de novo). Teste na Tarefa 9.
4. **Excluir um tipo de conteúdo ou rede em uso:** responde 409 com a mensagem "Em uso por N post(s)"; nenhum post fica sem tipo. Teste na Tarefa 5.
5. **Link do Drive malicioso ou errado** (`javascript:...`, texto sem `http`): o backend aceita só `http(s)://`, senão 422. Teste na Tarefa 7.
   Extra (dentro da Tarefa 8): uma data anual em 29/02 aparece em 28/02 nos anos não bissextos.

---

## Estrutura de arquivos

```
.gitignore                      # .superpowers/, node_modules, .venv, dist, __pycache__, .env
Dockerfile  fly.toml  README.md
backend/
  pyproject.toml  alembic.ini
  alembic/env.py  alembic/versions/0001_initial.py
  app/
    main.py          # create_app(): middleware, routers, static/SPA
    config.py        # Settings (env)
    db.py            # engine, SessionLocal, get_db, Base
    models.py        # todas as tabelas
    schemas.py       # modelos Pydantic de entrada/saída
    security.py      # hash_password, verify_password
    deps.py          # current_user, admin_user
    seed.py          # seed_defaults(db, user)
    holidays.py      # ensure_year, holidays_between
    dates.py         # expand_occurrences
    cli.py           # python -m app.cli create-admin
    routers/ auth.py users.py content_types.py platforms.py clients.py posts.py important_dates.py holidays.py
  tests/ conftest.py test_*.py
frontend/
  package.json  vite.config.ts  tsconfig.json  index.html  public/icons/*
  src/
    main.tsx  App.tsx  styles.css
    api/client.ts  api/types.ts
    lib/dates.ts  lib/image.ts  lib/labels.ts  lib/color.ts
    auth/AuthContext.tsx
    hooks/useCalendar.ts
    components/ TopNav.tsx ClientCard.tsx ClientForm.tsx StatusFilter.tsx DayTags.tsx PostBlock.tsx WeekView.tsx MonthView.tsx DayView.tsx PostPanel.tsx ColorListEditor.tsx
    pages/ LoginPage.tsx ClientsPage.tsx PlannerPage.tsx ContentTypesPage.tsx PlatformsPage.tsx ImportantDatesPage.tsx HolidaysPage.tsx UsersPage.tsx
    **/*.test.ts(x)
backup/ Dockerfile backup.sh fly.toml
```

Testes do backend usam SQLite em memória (`StaticPool`) para ser rápido. Os modelos usam só tipos portáveis (`JSON`, `LargeBinary`, `Enum(native_enum=False)`). Executar `TEST_DATABASE_URL=<postgres>` roda a mesma suíte contra um Postgres real; faça isso uma vez na Tarefa 17.

---

### Tarefa 1: Repositório e esqueleto do backend

**Arquivos:**
- Criar: `.gitignore`, `backend/pyproject.toml`, `backend/app/{__init__,main,config,db}.py`, `backend/tests/{__init__,conftest,test_health}.py`

**Interfaces:**
- Produz: `Settings` com `database_url: str`, `secret_key: str`, `static_dir: str | None = None`, `cookie_secure: bool = False`, `brasilapi_url: str = "https://brasilapi.com.br/api/feriados/v1"`. `get_settings()` faz cache com lru_cache. `config.normalize_db_url(url) -> str` troca `postgres://` e `postgresql://` por `postgresql+psycopg://`.
- Produz: `db.Base` (DeclarativeBase), `db.get_db()` (gerador de `Session`), `db.make_engine(url)`.
- Produz: `main.create_app(settings: Settings | None = None) -> FastAPI` e `app = create_app()`. `GET /api/health` → `{"ok": true}`.
- Produz (fixtures em `conftest.py`): `db_session`, `client` (TestClient com `get_db` sobrescrito, SQLite em memória e `Base.metadata.create_all`).

- [ ] **Passo 1:** `git init`. Criar `.gitignore` e o `pyproject.toml` com as dependências do tech stack (dev: pytest, httpx). Criar o venv e rodar `pip install -e ".[dev]"`.
- [ ] **Passo 2: teste que falha**

```python
def test_health(client):
    assert client.get("/api/health").json() == {"ok": True}

def test_normalize_db_url():
    assert normalize_db_url("postgres://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert normalize_db_url("postgresql://u:p@h/db?sslmode=require") == "postgresql+psycopg://u:p@h/db?sslmode=require"
```

- [ ] **Passo 3:** rodar `cd backend && pytest -q` → FALHA (import).
- [ ] **Passo 4:** implementar `config.py`, `db.py`, `main.py` e `conftest.py`.
- [ ] **Passo 5:** rodar `pytest -q` → PASSA.
- [ ] **Passo 6:** commit `chore: esqueleto do backend`.

### Tarefa 2: Modelos e migração inicial

**Arquivos:**
- Criar: `backend/app/models.py`, `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/versions/0001_initial.py`, `backend/tests/test_models.py`

**Interfaces:**
- Produz (em `models.py`):
  - `PostStatus(str, Enum)`: `a_fazer`, `editando`, `agendado`, `postado`
  - `CHECKLIST_KEYS = ("roteiro","captacao","edicao","aprovacao","agendamento")` e `empty_checklist() -> dict[str,bool]`
  - `User(id, email unique, password_hash, is_admin=False, is_active=True, created_at)`
  - `Client(id, user_id→users CASCADE, name, color, logo: bytes|None, logo_mime: str|None, archived=False, created_at)`
  - `ContentType(id, user_id CASCADE, name, color, position=0)` e `Platform` com os mesmos campos
  - `Post(id, client_id CASCADE, title, date: Date, time: Time|None, content_type_id→RESTRICT, format: str|None, status=a_fazer, description="", drive_url|None, checklist JSON=empty_checklist(), created_at, updated_at)` com `platforms` many-to-many via `post_platforms(post_id CASCADE, platform_id RESTRICT)`
  - `ImportantDate(id, user_id CASCADE, client_id→clients CASCADE nullable, date, name, recurring_yearly=False)`
  - `Holiday(date PK, name, year indexado)` e `HiddenHoliday(user_id, holiday_date)` com PK composta
- Índices: `posts(client_id, date)`, `important_dates(user_id, date)`.

- [ ] **Passo 1: teste que falha.** `test_post_defaults`: cria user, client, content_type e post só com os campos obrigatórios, faz commit, e verifica `status == PostStatus.a_fazer`, `checklist == {k: False for k in CHECKLIST_KEYS}` e `description == ""`. `test_delete_client_cascades_posts`: apagar o client apaga os posts.
- [ ] **Passo 2:** `pytest tests/test_models.py -q` → FALHA.
- [ ] **Passo 3:** implementar `models.py`. Configurar o Alembic lendo `get_settings().database_url`, e gerar e revisar `0001_initial.py` com `alembic revision --autogenerate` (o enum com `native_enum=False`). No SQLite, ligar `PRAGMA foreign_keys=ON` com um listener de connect no `make_engine`.
- [ ] **Passo 4:** `pytest -q` → PASSA.
- [ ] **Passo 5:** commit `feat: modelos e migração inicial`.

### Tarefa 3: Autenticação, sessão e criação da admin

**Arquivos:**
- Criar: `backend/app/{security,deps,seed,cli}.py`, `backend/app/routers/auth.py`, `backend/tests/test_auth.py`
- Modificar: `backend/app/main.py` (SessionMiddleware com `secret_key`, `same_site="lax"`, `https_only=settings.cookie_secure`, `max_age=30 dias`) e `conftest.py` (fixtures `make_user(email, password="senha123", is_admin=False) -> User` e `login(client, email, password)`)

**Interfaces:**
- Produz: `security.hash_password(pw) -> str` e `verify_password(pw, hash) -> bool` (argon2).
- Produz: `seed.create_user(db, email, password, is_admin=False) -> User`. Normaliza o e-mail (strip e lower), faz o hash e chama `seed_defaults`. Se o e-mail já existe, lança `ValueError("email_taken")`.
- Produz: `seed.seed_defaults(db, user)`, que insere os 5 tipos e as 5 redes padrão (Restrições globais) com `position` 0..4.
- Produz: `deps.current_user(request, db) -> User` (401 sem sessão ou com usuário inativo) e `deps.admin_user` (403 se não for admin).
- Produz rotas: `POST /api/auth/login {email, password}` → 200 `UserOut{id,email,is_admin}` e grava `session["uid"]`, ou 401 `{"detail":"E-mail ou senha inválidos"}` (a mesma mensagem para e-mail inexistente, senha errada e conta inativa). `POST /api/auth/logout` → 204. `GET /api/auth/me` → `UserOut` ou 401.
- Produz CLI: `python -m app.cli create-admin EMAIL` (pede a senha com getpass).

- [ ] **Passo 1: testes que falham:** `test_login_ok_then_me`, `test_login_wrong_password_401` (verifica a mensagem exata), `test_login_inactive_401`, `test_logout_clears_session` (depois do logout, `/me` → 401), `test_create_user_seeds_defaults` (5 tipos com os nomes e cores das Restrições, 5 redes), `test_email_normalized` (o login com `" Ana@X.com "` funciona para a conta criada como `ana@x.com`).
- [ ] **Passo 2:** `pytest tests/test_auth.py -q` → FALHA.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** `pytest -q` → PASSA.
- [ ] **Passo 5:** commit `feat: login por sessão e criação de admin`.

### Tarefa 4: Usuários (só admin)

**Arquivos:**
- Criar: `backend/app/routers/users.py`, `backend/tests/test_users.py`

**Interfaces:**
- Consome: `create_user` e `admin_user`.
- Produz: `GET /api/users` → `list[UserAdminOut{id,email,is_admin,is_active,created_at}]`. `POST /api/users {email, password}` → 201, ou 409 `"E-mail já cadastrado"`, com senha mínima de 8 caracteres (422). `PATCH /api/users/{id} {password?, is_active?}` → 200. A admin não pode desativar a si mesma (400).

- [ ] **Passo 1: testes que falham:** `test_non_admin_gets_403`, `test_admin_creates_user_who_can_login`, `test_duplicate_email_409`, `test_reset_password`, `test_deactivate_blocks_login`, `test_admin_cannot_deactivate_self`.
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5:** commit `feat: gestão de usuários pela admin`.

### Tarefa 5: Tipos de conteúdo e redes

**Arquivos:**
- Criar: `backend/app/routers/{content_types,platforms}.py`, `backend/app/schemas.py` (começa aqui), `backend/tests/test_content_types.py`, `backend/tests/test_platforms.py`

**Interfaces:**
- Produz: `schemas.HexColor`, um `Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$")]` salvo em minúsculas.
- Produz: `ColorItemIn{name: str (1–40), color: HexColor}` e `ColorItemOut{id,name,color,position}`.
- Produz rotas (iguais para os dois recursos, `/api/content-types` e `/api/platforms`): `GET` (ordenado por position, depois id), `POST` (position = máximo + 1), `PATCH /{id}`, `DELETE /{id}` → 204, ou 409 `{"detail":"Em uso por N post(s)"}`. `PUT /reorder {ids: list[int]}` redefine as positions.
- Um helper compartilhado, `routers/_color_items.py`: `make_color_item_router(model, prefix, in_use_count)`, para não duplicar código.

- [ ] **Passo 1: testes que falham:** `test_list_returns_seeded_in_order`, `test_create_and_update`, `test_invalid_color_422` (`"red"`, `"#12345"`), `test_delete_in_use_409` (cria um post com o tipo; a resposta é 409 com "Em uso por 1 post(s)" e o tipo continua existindo), `test_other_user_item_404` (PATCH e DELETE no item de outra conta → 404). Os mesmos casos para as redes.
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5:** commit `feat: CRUD de tipos de conteúdo e redes`.

### Tarefa 6: Clientes, logo e resumo da semana

**Arquivos:**
- Criar: `backend/app/routers/clients.py`, `backend/tests/test_clients.py`
- Modificar: `backend/app/schemas.py`

**Interfaces:**
- Produz: `ClientIn{name (1–60), color: HexColor}`, `ClientPatch{name?, color?, archived?}`.
- Produz: `ClientSummary{id, name, color, has_logo: bool, logo_version: int, archived, week_total: int, counts: dict[PostStatus,int] (as 4 chaves sempre presentes), next_post: {date, title} | None}`. `logo_version` é um hash curto do logo, usado para cache-bust.
- Produz rotas:
  - `GET /api/clients?week_start=YYYY-MM-DD&today=YYYY-MM-DD&archived=false` → `list[ClientSummary]` ordenada por nome. `week_total` e `counts` contam os posts entre `week_start` e `week_start+6`. `next_post` é o primeiro post com `date >= today` (ordem date, time, id).
  - `POST /api/clients` → 201 `ClientSummary`. `PATCH /api/clients/{id}`. `DELETE /api/clients/{id}` → 204.
  - `PUT /api/clients/{id}/logo` (multipart `file`; aceita `image/webp|png|jpeg` até 300 KB, senão 422/413). `GET /api/clients/{id}/logo` → bytes com o `logo_mime` e `Cache-Control: private, max-age=31536000` (o front usa `?v=logo_version`). `DELETE /api/clients/{id}/logo` → 204.
- Produz: `deps.get_owned_client(client_id, user, db) -> Client` (404 se for de outra conta), reaproveitado nas Tarefas 7 a 9.

- [ ] **Passo 1: testes que falham:** `test_summary_counts_and_next_post` (posts em 3/11 agendado, 4/11 editando e 10/11 a_fazer; com `week_start=2026-11-01` e `today=2026-11-04` → `week_total=2`, `counts.agendado=1`, `counts.editando=1`, `counts.a_fazer=0`, `next_post.date="2026-11-04"`), `test_archived_hidden_by_default`, `test_logo_roundtrip` (PUT de bytes PNG → `has_logo` true → GET devolve os mesmos bytes e o mime), `test_logo_too_big_413`, `test_logo_wrong_type_422`, `test_other_user_client_404` (GET do logo, PATCH e DELETE).
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5:** commit `feat: clientes com logo e resumo semanal`.

### Tarefa 7: Posts

**Arquivos:**
- Criar: `backend/app/routers/posts.py`, `backend/tests/test_posts.py`
- Modificar: `backend/app/schemas.py`

**Interfaces:**
- Produz: `PostIn{title (1–80), date, time?: "HH:MM", content_type_id, platform_ids: list[int] (pode ser vazia), format?: str (≤30), status=a_fazer, description="" , drive_url?: str, checklist?: dict}`. `PostPatch` tem os mesmos campos, todos opcionais. `drive_url` vazio vira `None`; se vier preenchido, precisa começar com `http://` ou `https://` (senão 422). `checklist` aceita só as `CHECKLIST_KEYS` com valores booleanos e completa as chaves que faltarem com `False`.
- Produz: `PostOut{id, client_id, title, date, time, content_type: ColorItemOut, platforms: list[ColorItemOut], format, status, description, drive_url, checklist, updated_at}`.
- Produz: `posts.list_posts(db, client, start, end, statuses: list[PostStatus] | None) -> list[Post]`, ordenada por date, time (nulos por último) e id. É reaproveitada na Tarefa 9.
- Produz rotas: `GET /api/clients/{cid}/posts?start&end&status=a_fazer&status=editando`. `POST /api/clients/{cid}/posts` → 201. `PATCH /api/posts/{id}`. `DELETE /api/posts/{id}` → 204. `POST /api/posts/{id}/duplicate` → 201, uma cópia com título `"{title} (cópia)"`, o status `a_fazer`, o checklist zerado e a mesma data.
- `content_type_id` e `platform_ids` de outra conta → 422 `"Tipo ou rede inválidos"`.

- [ ] **Passo 1: testes que falham:** `test_create_and_list_in_range`, `test_status_filter_multi`, `test_patch_date_moves_post` (a operação usada pelo arrastar), `test_checklist_partial_update_keeps_others`, `test_checklist_unknown_key_422`, `test_status_independent_of_checklist` (status `postado` com o checklist todo `False` → 200), `test_drive_url_rejects_javascript` (`"javascript:alert(1)"` → 422; `"drive.google.com/x"` → 422; `"https://drive.google.com/x"` → 200), `test_duplicate`, `test_foreign_content_type_422`, `test_other_user_post_404` (PATCH, DELETE e duplicate).
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5:** commit `feat: CRUD de posts com checklist e duplicar`.

### Tarefa 8: Datas importantes

**Arquivos:**
- Criar: `backend/app/dates.py`, `backend/app/routers/important_dates.py`, `backend/tests/test_important_dates.py`

**Interfaces:**
- Produz: `dates.Occurrence{id, date, name, client_id: int | None, recurring_yearly: bool}` (Pydantic) e `dates.expand_occurrences(items: list[ImportantDate], start: date, end: date) -> list[Occurrence]`. As não recorrentes entram se estiverem no intervalo. As anuais entram uma vez para cada ano do intervalo em que (mês, dia) cair dentro dele, e 29/02 vira 28/02 em ano não bissexto. A data cadastrada é a primeira ocorrência: nada aparece antes dela. A saída é ordenada por date e depois name.
- Produz: `ImportantDateIn{date, name (1–60), client_id?: int, recurring_yearly=False}` e `ImportantDateOut` (o registro cru).
- Produz rotas: `GET /api/important-dates?client_id=<id>|general` → lista crua para a tela de cadastro (`general` = só as gerais). `POST`, `PATCH /{id}`, `DELETE /{id}`. Um `client_id` de outra conta → 404.
- Produz: `important_dates.occurrences_for_client(db, user, client, start, end) -> list[Occurrence]`, que junta as gerais da conta e as do cliente. É usada na Tarefa 9.

- [ ] **Passo 1: testes que falham:** `test_expand_non_recurring_in_and_out_of_range`, `test_expand_yearly_across_year_boundary` (25/12/2025 anual; intervalo de 2026-12-20 a 2027-01-05 → só 2026-12-25), `test_expand_yearly_not_before_first` (cadastrada em 2027 não aparece em 2026), `test_feb29_on_non_leap_year` (29/02/2024 anual; intervalo de fevereiro de 2026 → 2026-02-28), `test_occurrences_merge_general_and_client_only` (a data de outro cliente não aparece), `test_other_user_date_404`.
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5:** commit `feat: datas importantes gerais e por cliente`.

### Tarefa 9: Feriados e endpoint do calendário

**Arquivos:**
- Criar: `backend/app/holidays.py`, `backend/app/routers/holidays.py`, `backend/tests/test_holidays.py`, `backend/tests/test_calendar.py`
- Modificar: `backend/app/routers/clients.py` (rota do calendário)

**Interfaces:**
- Produz: `holidays.Fetcher = Callable[[int], list[dict]]` e `default_fetcher(year)` (httpx com timeout de 5 s; mantém só `type == "national"`).
- Produz: `holidays.ensure_year(db, year, fetcher) -> bool`. Se já existir alguma linha daquele ano, retorna True sem chamar o fetcher. Se não, busca e insere. Em qualquer exceção ou lista vazia, registra um warning, **não grava nada** e retorna False.
- Produz: `holidays.holidays_between(db, user, start, end, fetcher, include_hidden=False) -> list[HolidayOut{date, name, hidden: bool}]`, que chama `ensure_year` para cada ano do intervalo.
- O fetcher entra por dependência do FastAPI (`get_holiday_fetcher`), para os testes poderem trocá-lo.
- Produz rotas: `GET /api/holidays?year=YYYY` → todos os feriados do ano com `hidden` (para a tela de ocultar). `POST /api/holidays/{date}/hide` → 204. `DELETE /api/holidays/{date}/hide` → 204.
- Produz: `GET /api/clients/{cid}/calendar?start&end&status=...` → `CalendarOut{posts: list[PostOut], holidays: list[HolidayOut] (sem os ocultos), important_dates: list[Occurrence]}`. Se `end < start` ou o intervalo passar de 62 dias → 400.

- [ ] **Passo 1: testes que falham:** `test_ensure_year_caches` (o fetcher falso é chamado 1 vez em 2 chamadas), `test_fetch_failure_not_cached` (o fetcher que lança exceção → False e 0 linhas; o próximo fetcher bom grava), `test_only_national_kept`, `test_hide_and_unhide` (o feriado oculto some do calendário mas aparece com `hidden=true` em `/api/holidays?year=`), `test_hidden_is_per_user`, `test_calendar_combines_all` (semana de 1 a 7/11/2026 com Finados em 02/11 no fetcher falso, uma data importante e um post), `test_calendar_works_when_brasilapi_down` (o fetcher lança exceção → 200 com `holidays == []`), `test_calendar_range_limit_400`.
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar `pytest -q` (a suíte inteira) → PASSA.
- [ ] **Passo 5:** commit `feat: feriados da BrasilAPI e endpoint de calendário`.

### Tarefa 10: Esqueleto do frontend, login e PWA

**Arquivos:**
- Criar: `frontend/` com Vite (react-ts), `vite.config.ts` (proxy de `/api` para `http://localhost:8000`; `VitePWA` com `registerType: "autoUpdate"`, manifest `name: "Planner Social"`, `lang: "pt-BR"`, `theme_color: "#faf8f4"`, `display: "standalone"` e ícones de 192 e 512 em `public/icons/`; o `navigateFallbackDenylist: [/^\/api\//]` evita que o service worker sirva o HTML no lugar da API), `src/api/{client,types}.ts`, `src/auth/AuthContext.tsx`, `src/pages/LoginPage.tsx`, `src/App.tsx`, `src/styles.css`, `src/components/TopNav.tsx` e os testes.

**Interfaces:**
- Produz: `api<T>(path: string, init?: RequestInit & {json?: unknown}) -> Promise<T>`, com `credentials: "same-origin"`. Se a resposta não for ok, lança `ApiError{status, detail: string}`. Um 401 fora de `/api/auth/*` dispara o evento `auth:expired` em `window`.
- Produz: `types.ts` espelhando os schemas: `User`, `ColorItem`, `ClientSummary`, `Post`, `PostInput`, `PostStatus = "a_fazer"|"editando"|"agendado"|"postado"`, `Checklist`, `Holiday`, `Occurrence`, `Calendar`.
- Produz: `useAuth() -> {user: User | null, loading, login(email, pw), logout()}`. `<RequireAuth>` redireciona para `/login`, e `<RequireAdmin>` também.
- Rotas em `App.tsx`: `/login`, `/` (Clientes), `/clientes/:id` (Planner; query `view=semana|mes|dia` e `data=YYYY-MM-DD`), `/config/tipos`, `/config/redes`, `/config/datas`, `/config/feriados`, `/usuarios`.
- `styles.css`: variáveis `--bg:#faf8f4`, `--card:#fff`, `--ink:#222`, `--muted:#777`, `--radius:10px` e fonte de sistema (direção visual do mockup `.superpowers/brainstorm/*/content/planner-semanal.html`).
- `TopNav`: "Meus clientes", "Tipos de conteúdo", "Redes", "Datas importantes", "Usuários" (só admin) e "Sair". No celular, vira um menu ☰.

- [ ] **Passo 1:** criar o projeto (`npm create vite@latest frontend -- --template react-ts`). Instalar react-router-dom, vite-plugin-pwa, e como dev vitest, @testing-library/react, @testing-library/user-event e jsdom. Script `"test": "vitest run"`.
- [ ] **Passo 2: testes que falham** (`LoginPage.test.tsx`, com `fetch` mockado): enviar o formulário chama `POST /api/auth/login` e navega para `/`. Um 401 mostra "E-mail ou senha inválidos". `client.test.ts`: um 500 com `{"detail":"x"}` lança `ApiError` com `detail === "x"`.
- [ ] **Passo 3:** `cd frontend && npm test` → FALHA. **Passo 4:** implementar. **Passo 5:** `npm test` → PASSA. `npm run build` → sem erros de tipo.
- [ ] **Passo 6: verificação manual:** com o backend (`uvicorn app.main:app --reload`, com `DATABASE_URL` apontando para um Postgres local ou um branch do Neon) e o `npm run dev` rodando, criar a admin pela CLI, entrar e sair.
- [ ] **Passo 7:** commit `feat: frontend com login e PWA`.

### Tarefa 11: Utilitários de data, cor e rótulos

**Arquivos:**
- Criar: `frontend/src/lib/{dates,color,labels}.ts` e os testes `dates.test.ts` e `color.test.ts`

**Interfaces:**
- Produz (`dates.ts`, sempre em data local e nunca com `new Date(isoString)`): `parseISODate(s) -> Date`, `toISODate(d) -> string`, `todayISO() -> string`, `addDays(iso, n) -> string`, `startOfWeek(iso) -> string` (o domingo da semana), `weekDays(startIso) -> string[7]`, `monthGrid(iso) -> string[][]` (as semanas, de domingo a sábado, que cobrem o mês; 4 a 6 linhas), `isSameMonth(a, b) -> boolean`, `formatWeekRange(startIso) -> string` ("1–7 nov 2026", "29 nov – 5 dez 2026"), `weekdayShort(iso) -> "Dom"|"Seg"|...`.
- Produz (`color.ts`): `tint(hex, pct=22) -> string` (a mistura com branco, em `#rrggbb`, para o fundo dos blocos; o texto fica sempre `--ink`).
- Produz (`labels.ts`): `STATUS_LABEL: Record<PostStatus,string>`, `STATUS_ORDER`, `CHECKLIST_ITEMS: {key, label}[]` (na ordem das Restrições globais) e `FORMAT_SUGGESTIONS`.

- [ ] **Passo 1: testes que falham:** `toISODate(parseISODate("2026-11-02")) === "2026-11-02"` com `process.env.TZ = "America/Sao_Paulo"` (definido no `vitest.config`/setup); `startOfWeek("2026-11-04") === "2026-11-01"`; `startOfWeek("2026-11-01") === "2026-11-01"`; `weekDays("2026-11-01")[6] === "2026-11-07"`; `monthGrid("2026-11-15")` tem 5 linhas, a primeira começa em `"2026-11-01"` e a última termina em `"2026-12-05"`; `addDays("2026-12-31", 1) === "2027-01-01"`; `formatWeekRange("2026-11-29") === "29 nov – 5 dez 2026"`; `tint("#000000", 50) === "#808080"` (arredondando).
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5:** commit `feat: utilitários de data e cor`.

### Tarefa 12: Tela de clientes

**Arquivos:**
- Criar: `frontend/src/pages/ClientsPage.tsx`, `frontend/src/components/{ClientCard,ClientForm}.tsx`, `frontend/src/lib/image.ts` e os testes

**Interfaces:**
- Consome: `GET /api/clients?week_start&today`, `POST/PATCH/DELETE /api/clients` e `PUT/DELETE /api/clients/{id}/logo`.
- Produz: `resizeImage(file: File, max=256) -> Promise<Blob>` (canvas; mantém a proporção; `image/webp` com qualidade 0.85).
- `ClientCard({client, onOpen, onEdit})`: borda superior na cor do cliente. Mostra o logo (`/api/clients/{id}/logo?v={logo_version}`, em círculo) ou as iniciais (as 2 primeiras letras das 2 primeiras palavras) sobre a cor. Depois vêm o nome, "Esta semana: N posts" (ou "Esta semana: nenhum post" mais a etiqueta "semana vazia"), as contagens não zeradas ("2 a fazer") e "Próximo: Ter 3/11 · {title}". Um botão ⋯ abre a edição.
- `ClientForm`: nome, cor (`<input type="color">`), logo (escolher, pré-visualizar, remover) e "Arquivar". O upload do logo usa `resizeImage` e é feito depois de salvar o cliente.
- A página tem uma grade responsiva (3 colunas no desktop, 1 no celular), o card "+ Novo cliente" e o link "Ver arquivados".

- [ ] **Passo 1: testes que falham:** `ClientCard.test.tsx`: sem logo mostra as iniciais "PT" para "Padaria Trigo"; com `week_total: 0` mostra "semana vazia"; clicar chama `onOpen(id)`. `ClientsPage.test.tsx`: busca com `week_start` = `startOfWeek(todayISO())`.
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5: verificação manual** no navegador: criar um cliente com logo e conferir o card (compare com o mockup `clientes.html`).
- [ ] **Passo 6:** commit `feat: tela de clientes em cards`.

### Tarefa 13: Planner semanal

**Arquivos:**
- Criar: `frontend/src/pages/PlannerPage.tsx`, `frontend/src/hooks/useCalendar.ts`, `frontend/src/components/{WeekView,PostBlock,DayTags,StatusFilter}.tsx` e os testes

**Interfaces:**
- Consome: `GET /api/clients/{id}/calendar` e `PATCH /api/posts/{id}` (para o arrastar).
- Produz: `useCalendar(clientId, start, end, statuses) -> {data: Calendar | null, loading, error, reload()}`. Os filtros de status vão para a query, então o backend filtra.
- Produz: `PostBlock({post, compact?, onClick, draggable?})`. Fundo `tint(post.content_type.color)` e `border-left: 4px solid` na cor. Mostra o título, o nome do tipo, as redes e o formato ("Instagram · Reels"; no modo compacto, só o título), o horário e a etiqueta do status.
- Produz: `DayTags({holidays, dates})`: feriado em vermelho-claro com o rótulo "🇧🇷 {nome}", data importante em lilás com "★ {nome}".
- Produz: `StatusFilter({value: PostStatus[], onChange})`: chips "Todos", "A fazer", "Editando", "Agendado" e "Postado". "Todos" corresponde a uma lista vazia.
- `PlannerPage`: cabeçalho com o logo ou as iniciais, o nome, `formatWeekRange` e os botões ‹ › e "Hoje". Tem as abas Dia, Semana e Mês e o StatusFilter. O estado de `view` e `data` fica na URL. O `start` e o `end` vêm da view.
- `WeekView({days, calendar, onOpenPost, onCreate(date), onMove(postId, date)})`: 7 colunas iguais à opção A do mockup. Cada coluna tem o cabeçalho "Seg 2", depois as DayTags, os PostBlocks e um botão "+". O arrastar usa o DnD nativo do HTML5 e fica ativo só quando `matchMedia("(pointer: fine)")`. Ao soltar, faz um PATCH otimista `{date}` e, se falhar, recarrega. Abaixo de 768 px as colunas ocupam 85vw com `scroll-snap-type: x mandatory`, e o scroll inicial leva a coluna de hoje (ou a primeira) para a vista. O dia de hoje tem destaque.

- [ ] **Passo 1: testes que falham:** `PostBlock.test.tsx` (o fundo é `tint(color)`; mostra "Agendado"). `StatusFilter.test.tsx` (clicar em "A fazer" e depois em "Editando" → `onChange(["a_fazer","editando"])`; "Todos" → `[]`). `WeekView.test.tsx` (com um Calendar fixo da semana de 01/11/2026: Finados aparece na coluna de "Seg 2"; o post de 03/11 aparece na coluna "Ter 3"; um `drop` simulado na coluna "Sex 6" chama `onMove(id, "2026-11-06")`).
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5: verificação manual:** no desktop e no modo celular do navegador (375 px), conferir o swipe entre os dias, o arrastar no desktop e os filtros.
- [ ] **Passo 6:** commit `feat: planner semanal em colunas`.

### Tarefa 14: Painel do post

**Arquivos:**
- Criar: `frontend/src/components/PostPanel.tsx` e `PostPanel.test.tsx`
- Modificar: `PlannerPage.tsx` (abre o painel pelo `onOpenPost` e pelo `onCreate`)

**Interfaces:**
- Consome: `GET /api/content-types` e `GET /api/platforms` (carregados uma vez no PlannerPage), mais `POST /api/clients/{cid}/posts`, `PATCH /api/posts/{id}`, `DELETE /api/posts/{id}` e `POST /api/posts/{id}/duplicate`.
- Produz: `PostPanel({clientId, post?: Post, defaultDate?: string, contentTypes, platforms, onClose, onSaved})`. No desktop (≥768 px) é um painel lateral de 420 px; abaixo disso, uma tela cheia por cima. Os campos estão na tabela da seção 5.6 do spec: as redes são chips de seleção múltipla; o formato é um `<input list>` com as `FORMAT_SUGGESTIONS`; o status é um seletor segmentado; a descrição é um textarea que cresce; o link do Drive tem um botão "Abrir" (`target="_blank" rel="noopener"`), visível só se começar com `http`; o checklist mostra os 5 checkboxes com os rótulos e o progresso "3/5".
- Para criar, o tipo padrão é o primeiro da lista e a data é `defaultDate`. Salvar valida o título e o tipo. Os erros 422 do backend aparecem no campo ou no topo.
- Excluir pede confirmação com `window.confirm("Excluir este post?")`. Duplicar fecha o painel e recarrega. Esc fecha.

- [ ] **Passo 1: testes que falham:** `creates post with defaults` (abrir com `defaultDate="2026-11-03"`, digitar o título e salvar → `POST` com `date:"2026-11-03"`, `content_type_id` = o primeiro tipo e `status:"a_fazer"`); `edits checklist` (marcar "Aprovação" e salvar → o `PATCH` inclui `checklist.aprovacao === true`); `shows backend 422 detail`; `delete asks confirmation` (confirm false → nenhuma chamada).
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5:** commit `feat: painel de edição do post`.

### Tarefa 15: Visões mensal e diária

**Arquivos:**
- Criar: `frontend/src/components/{MonthView,DayView}.tsx` e os testes
- Modificar: `PlannerPage.tsx`

**Interfaces:**
- `MonthView({grid: string[][], month: string, calendar, onOpenDay(date), onOpenPost})`: grade de domingo a sábado. Os dias de fora do mês ficam esmaecidos. Cada célula tem o número, as DayTags compactas e até 3 `PostBlock compact`, e "+N" quando houver mais. Clicar no número ou no espaço vazio chama `onOpenDay`, que leva à view `dia`. No celular, a célula mostra só pontos coloridos (um por post) e as tags viram um ponto. O período buscado é a grade inteira (até 42 dias, abaixo do limite de 62).
- `DayView({date, calendar, onOpenPost, onCreate})`: as DayTags e uma lista de cards, um por post, com o título, o tipo e a cor, as redes e o formato, o horário, o status, o checklist (só leitura, com o progresso), a descrição (até 4 linhas) e o link do Drive. Tem o botão "+ Novo post".
- As setas ‹ › andam um mês na view mês e um dia na view dia. O cabeçalho mostra "novembro 2026" ou "Ter, 3 nov 2026".

- [ ] **Passo 1: testes que falham:** `MonthView` com 5 posts num dia → 3 blocos e "+2"; clicar no dia 18 → `onOpenDay("2026-11-18")`. `DayView` mostra "3/5" para um checklist com 3 itens marcados e o link do Drive como `<a href>`.
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5:** commit `feat: visões mensal e diária`.

### Tarefa 16: Telas de cadastro: tipos, redes, datas, feriados e usuários

**Arquivos:**
- Criar: `frontend/src/components/ColorListEditor.tsx`, `frontend/src/pages/{ContentTypesPage,PlatformsPage,ImportantDatesPage,HolidaysPage,UsersPage}.tsx` e os testes
- Modificar: `PlannerPage.tsx` (um link "Datas do cliente" no cabeçalho abre o `ImportantDatesPage` filtrado pelo cliente, num modal ou na rota `/config/datas?cliente={id}`)

**Interfaces:**
- `ColorListEditor({endpoint: "/api/content-types" | "/api/platforms", title})`: a lista com uma bolinha de cor, o nome editável inline e um `<input type="color">`. Salva ao sair do campo. Tem os botões ↑↓ (que chamam `/reorder`), excluir (um 409 mostra o `detail`, por exemplo "Em uso por 3 post(s)") e "+ Adicionar".
- `ImportantDatesPage`: duas seções, "Gerais (todos os clientes)" e "Por cliente" (um seletor de cliente; abre já selecionado se vier `?cliente=`). Cada item tem data, nome, a caixa "Repete todo ano" e excluir.
- `HolidaysPage`: um seletor de ano (o atual e o próximo) e a lista de `GET /api/holidays?year=` com um toggle "Mostrar/Ocultar". Se a lista vier vazia, mostra "Não foi possível carregar os feriados agora. Tente mais tarde."
- `UsersPage` (só admin): a tabela de usuários, "+ Novo usuário" (e-mail e senha provisória), "Redefinir senha" e um toggle "Ativo".

- [ ] **Passo 1: testes que falham:** `ColorListEditor` exibe o detalhe do 409 ao excluir; `HolidaysPage` chama `POST /api/holidays/2026-11-02/hide` ao clicar em "Ocultar" no Finados; `UsersPage` não renderiza para quem não é admin (redireciona).
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5:** commit `feat: telas de cadastro e usuários`.

### Tarefa 17: Deploy no Fly com o frontend embutido

**Arquivos:**
- Criar: `Dockerfile`, `fly.toml`, `.dockerignore`, `backend/tests/test_spa.py` e o `README.md` (como rodar localmente, deploy, criar a admin)
- Modificar: `backend/app/main.py`

**Interfaces:**
- `create_app`: se `settings.static_dir` estiver definido, monta `/assets` (StaticFiles) e serve os arquivos da raiz (`manifest.webmanifest`, `sw.js`, `icons/*`). Qualquer outro `GET` que não comece com `/api` devolve o `index.html` (fallback de SPA). Um `/api/*` inexistente continua devolvendo 404 em JSON. O `sw.js` vai com `Cache-Control: no-cache`.
- `Dockerfile` em dois estágios: `node:24-slim` roda `npm ci && npm run build` dentro de `frontend/`, e o `python:3.13-slim` instala o backend, copia `frontend/dist` para `/app/static` e define `STATIC_DIR=/app/static`. O CMD é `uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers`.
- `fly.toml`: `internal_port = 8000`, `[deploy] release_command = "alembic upgrade head"`, `force_https = true`, `auto_stop_machines = "stop"`, `min_machines_running = 0`, região `gru` e o health check em `/api/health`. As variáveis `COOKIE_SECURE=true`. Os secrets: `DATABASE_URL` (Neon) e `SECRET_KEY`.

- [ ] **Passo 1: teste que falha (`test_spa.py`)**, com `static_dir` num tmp com `index.html` e `assets/a.js`: `GET /clientes/3` → 200 com o HTML; `GET /assets/a.js` → o JS; `GET /api/nao-existe` → 404 em JSON.
- [ ] **Passo 2:** rodar → FALHA. **Passo 3:** implementar. **Passo 4:** rodar → PASSA.
- [ ] **Passo 5:** rodar a suíte contra o Postgres: `docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=x postgres:17` e depois `TEST_DATABASE_URL=postgresql+psycopg://postgres:x@localhost:5433/postgres pytest -q` → PASSA. O `conftest.py` precisa respeitar o `TEST_DATABASE_URL`.
- [ ] **Passo 6:** `docker build -t planner .` e `docker run` local com o Postgres do passo 5 → o app abre em `http://localhost:8000`, o login funciona e o Chrome mostra "Instalar app".
- [ ] **Passo 7 (com a usuária, porque usa as contas dela):** `fly launch --no-deploy`, `fly secrets set DATABASE_URL=... SECRET_KEY=...`, `fly deploy` e `fly ssh console -C "python -m app.cli create-admin <email>"`. Conferir pelo celular: instalar na tela inicial.
- [ ] **Passo 8:** commit `feat: deploy no Fly`.

### Tarefa 18: Backup diário no Cloudflare R2

**Arquivos:**
- Criar: `backup/Dockerfile`, `backup/backup.sh`, `backup/fly.toml`
- Modificar: `README.md` (seção "Backup e restauração")

**Interfaces:**
- `backup/Dockerfile`: `FROM postgres:17-alpine` mais `apk add --no-cache aws-cli`. O `pg_dump` precisa ter versão ≥ à do servidor Neon; confira com `SELECT version()` e, se preciso, ajuste a tag.
- `backup.sh` (`set -euo pipefail`): `pg_dump --format=custom --no-owner "$DATABASE_URL" > /tmp/planner-$(date -u +%Y-%m-%d).dump`, depois `aws s3 cp ... "s3://$R2_BUCKET/planner/" --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"`. As credenciais vêm de `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` (o token do R2). Termina com exit ≠ 0 se algo falhar.
- Agendamento: app Fly separado (`planner-backup`), máquina criada com `fly machine run . --schedule daily --app planner-backup`, e secrets `DATABASE_URL`, `R2_BUCKET`, `R2_ACCOUNT_ID`, `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`.
- Retenção de 30 dias: regra de ciclo de vida no bucket do R2 ("Delete objects after 30 days" no prefixo `planner/`), configurada no painel da Cloudflare e documentada no README.
- O README documenta a restauração: baixar o dump com `aws s3 cp` e rodar `pg_restore --clean --no-owner -d "$DATABASE_URL" arquivo.dump` (de preferência num branch novo do Neon primeiro).

- [ ] **Passo 1: verificação local:** `docker build -t planner-backup backup/` e rodar com o Postgres da Tarefa 17 e as variáveis de um bucket R2 de teste → o objeto `planner/AAAA-MM-DD.dump` aparece no R2. Restaurar o dump num Postgres vazio dá o mesmo número de linhas em `posts`.
- [ ] **Passo 2:** rodar com `DATABASE_URL` inválida → exit ≠ 0 e nada enviado.
- [ ] **Passo 3 (com a usuária):** criar o bucket, o token e a regra de 30 dias, depois os secrets e a máquina agendada. No dia seguinte, conferir que o dump apareceu.
- [ ] **Passo 4:** commit `feat: backup diário do banco no R2`.
