# Planner de Mídias Sociais: Design

Data: 2026-10-18
Status: rascunho para aprovação

## 1. Intenção e porquê

Quem cuida das redes sociais de vários clientes hoje planeja os posts em templates estáticos de calendário (como os do Canva). Eles são bonitos e fáceis de ler pelas cores, mas não acompanham o andamento do trabalho. Este app mantém a mesma leitura visual (blocos coloridos por tipo de conteúdo, num calendário) e acrescenta o controle do trabalho: status de cada post, checklist de produção, descrição/roteiro, link da pasta do Drive e datas importantes.

O app roda no navegador e pode ser instalado no celular como PWA.

**Sucesso:** a usuária abre o app, escolhe o cliente e, em segundos, vê a semana com o que falta fazer, o que está em edição, o que está agendado e o que já saiu, e edita qualquer post sem sair da tela.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- Clientes em cards e, dentro de cada cliente, o planner semanal como tela principal.
- Visões mensal e diária como alternativas.
- Cor do post definida pelo **tipo de conteúdo**.
- Filtros por status.
- Edição rápida do post: clicar no bloco abre o painel de edição.
- Datas importantes (gerais e por cliente) e feriados nacionais automáticos, todos visíveis nas visualizações.
- Instalável no celular (PWA) e confortável em telas pequenas.

**Não-objetivos (por enquanto)**
- Times, compartilhamento entre usuários ou permissões por cliente. Cada usuário vê só os próprios dados.
- Cadastro aberto. As contas são criadas pela administradora.
- Publicar ou agendar direto nas redes sociais (integração com Instagram, TikTok etc.).
- Upload dos materiais do post. Os arquivos ficam no Google Drive e o app guarda só o link.
- Busca automática de datas comemorativas além dos feriados nacionais.
- Recuperação de senha por e-mail.
- Funcionamento offline com sincronização.

**Anti-objetivos (fracasso mesmo que funcione)**
- Overengineering: muitas camadas, serviços extras ou infraestrutura além do necessário. A pilha precisa ser pequena e fácil de manter por uma pessoa.
- Perder a leitura rápida por cor. Se a semana não for entendida num relance, o app falhou.
- Editar um post exigir navegação pesada (sair da semana, várias telas).

## 3. Restrições (decididas pela usuária)

- Banco de dados: **Neon** (Postgres).
- Deploy: **Fly.io**.
- **Cloudflare** para a cópia diária do banco (Cloudflare R2). Ver seção 9.
- Backend em **Python**.
- Frontend à escolha do builder, sem overengineering.

## 4. Pilha técnica (escolhas minhas)

- **Backend:** FastAPI, SQLAlchemy 2 e Alembic para as migrações, Pydantic para validação.
- **Frontend:** React, Vite e TypeScript, com `vite-plugin-pwa` para manifest e service worker. CSS simples (CSS modules ou um arquivo de estilos com variáveis); sem framework de UI pesado. O calendário é feito à mão (as grades são simples) e o drag-and-drop usa a API nativa de HTML5 ou uma lib leve como `@dnd-kit`.
- **Deploy:** um único app no Fly. O FastAPI serve a API em `/api` e os arquivos estáticos do build do frontend. Assim fica uma origem só, sem CORS.
- **Autenticação:** e-mail e senha, com hash (argon2 ou bcrypt), e sessão em cookie httpOnly assinado.
- **Feriados:** BrasilAPI `GET https://brasilapi.com.br/api/feriados/v1/{ano}` (testada: retorna `date`, `name`, `type`).

## 5. Telas e comportamento

### 5.1 Login
E-mail e senha. Sem "criar conta" e sem "esqueci a senha".

### 5.2 Clientes (tela inicial)
- Grade de cards, um por cliente: **logo** (ou iniciais sobre a cor do cliente, se não houver logo), nome, quantidade de posts na semana atual, contagem por status ("2 a fazer", "1 editando"...), o próximo post (data e título) e o aviso "semana vazia" quando não há posts.
- Um card "+ Novo cliente".
- Menu do topo: Tipos de conteúdo, Redes, Datas importantes (gerais), Usuários (só para admin) e Sair.
- Cliente: nome, cor, logo (opcional) e datas importantes próprias. Dá para editar e arquivar.

### 5.3 Planner semanal (tela principal do cliente)
- Abre na semana atual, de domingo a sábado. Navegação ‹ › e botão "Hoje".
- **Uma coluna por dia** (layout aprovado no mockup "A"). No celular, mostra uma coluna por vez, deslizando para o lado.
- No topo do dia ficam os feriados e as datas importantes, como etiquetas (feriado com estilo próprio e data importante com outro).
- Cada post é um bloco com a cor do tipo de conteúdo e mostra título, tipo, redes e formato, horário (se houver) e status.
- Filtros por status: Todos, A fazer, Editando, Agendado, Postado.
- "+" em cada dia cria um post naquele dia.
- **Arrastar** um post para outro dia muda a data, no computador. No celular a data é trocada no painel do post.
- Alternância Dia / Semana / Mês.

### 5.4 Calendário mensal
Grade do mês com os posts em blocos coloridos menores, os feriados e as datas importantes. Os filtros de status também valem aqui. Clicar no dia abre a visão diária.

### 5.5 Visão diária
Lista dos posts do dia com os detalhes à mostra: checklist, descrição e link do Drive. Também mostra as etiquetas de feriado e de datas importantes.

### 5.6 Painel do post
Abre ao clicar num post: painel lateral no computador e tela por cima no celular. Os campos:

| Campo | Regra |
|---|---|
| Título | obrigatório, curto (aparece no bloco) |
| Data | obrigatória |
| Horário | opcional |
| Tipo de conteúdo | obrigatório; define a cor |
| Redes | uma ou mais |
| Formato | opcional (Reels, Carrossel, Story, Estático, Vídeo...) |
| Status | A fazer, Editando, Agendado, Postado |
| Descrição | texto livre (roteiro, legenda, observações) |
| Link do Google Drive | URL opcional, abre em nova aba |
| Checklist | itens fixos: Roteiro, Captação/materiais, Edição/arte, Aprovação, Agendamento |

O status e o checklist são **independentes**: marcar itens do checklist não muda o status, e "Postado" não exige o checklist completo. *Minha escolha, para manter o comportamento previsível.*

Ações: salvar, excluir (com confirmação) e duplicar.

### 5.7 Tipos de conteúdo
Lista única por usuário, válida para todos os clientes. Cada tipo tem nome e cor (seletor de cor). Ao criar uma conta, ela já vem com alguns tipos de exemplo (Dica, Tutorial, Bastidores, Promoção, Enquete).

### 5.8 Redes
Lista editável por usuário, com nome e cor ou sigla. Vem com Instagram, TikTok, Facebook, LinkedIn e YouTube.

### 5.9 Datas importantes
- **Gerais**, por usuário e valendo para todos os clientes (ex.: Dia das Mães), e **por cliente** (ex.: aniversário da loja).
- Campos: data, nome e "repete todo ano" (*minha escolha: útil para aniversários*).
- **Feriados nacionais:** carregados da BrasilAPI. Na primeira vez que um ano é exibido, o backend busca e guarda os feriados numa tabela compartilhada. A usuária pode **ocultar** um feriado específico.

### 5.10 Usuários (só admin)
Lista de contas. A admin cria contas (e-mail e senha provisória), redefine senhas e desativa contas. A primeira conta admin é criada por um comando/script no deploy.

## 6. Modelo de dados (esboço)

- `users`: id, email (único), password_hash, is_admin, is_active, created_at
- `clients`: id, user_id, name, color, logo (bytes, imagem já reduzida), archived, created_at
- `content_types`: id, user_id, name, color, position
- `platforms`: id, user_id, name, color, position
- `posts`: id, client_id, title, date, time (nullable), content_type_id, format (nullable), status (enum), description, drive_url, checklist (JSON com os 5 itens booleanos), created_at, updated_at
- `post_platforms`: post_id, platform_id
- `important_dates`: id, user_id, client_id (nullable: nulo = geral), date, name, recurring_yearly
- `holidays`: date, name, year (compartilhada, vem da BrasilAPI)
- `hidden_holidays`: user_id, holiday_date

Toda consulta é filtrada pelo `user_id` do usuário logado.

## 7. Logo do cliente
O frontend reduz a imagem (ex.: no máximo 256×256, WebP ou PNG) antes de enviar, e o backend guarda os bytes no Postgres e serve por `/api/clients/{id}/logo`. Não há serviço de arquivos separado. *Minha escolha, para não adicionar infraestrutura.*

## 8. Visual
- Inspiração: templates de calendário do Canva. Fundo claro e quente, cards brancos arredondados e cores pastel por tipo.
- Os mockups aprovados estão em `.superpowers/brainstorm/*/content/` (`planner-semanal.html`, opção A, e `clientes.html`).
- O texto do bloco precisa ficar legível sobre qualquer cor escolhida (o builder garante contraste, por exemplo com fundo claro e uma borda forte na cor do tipo).
- Interface em português do Brasil.

## 9. Backup
Cópia diária do banco (confirmado pela usuária): um job agendado (Fly Machine agendada ou GitHub Action, à escolha do builder) roda `pg_dump` do Neon e envia o arquivo compactado para um bucket no Cloudflare R2. Guarda os últimos **30 dias** (*minha escolha*); os mais antigos são apagados por uma regra de ciclo de vida do bucket. Restaurar é manual (baixar o dump e rodar `pg_restore`), e o passo a passo fica documentado no README.

## 10. Deixado ao builder
- Estrutura de pastas, nomes de rotas da API e organização dos componentes.
- Biblioteca de drag-and-drop (ou a API nativa).
- Detalhes visuais finos (tipografia, espaçamentos) dentro da direção da seção 8.
- Estratégia de testes, proporcional ao tamanho do projeto: testes de API para regras importantes (isolamento por usuário, feriados) e poucos testes de interface.
