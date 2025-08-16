# CME Manager — Backend

> API para gestão de materiais, ciclos e alertas (Node.js + Express + Prisma).  
> Este README cobre **setup local**, **variáveis de ambiente**, **endpoints principais**, **SSE**, **paginação/sort**, e **dicas de troubleshooting**.

---

## 📦 Stack

- **Node.js** 18+ (recomendado 18.20 ou 20.x)
- **TypeScript**
- **Express**
- **Prisma** (qualquer banco suportado; recomendamos PostgreSQL)
- **JWT** para autenticação (`Authorization: Bearer <token>`)
- **SSE** (Server‑Sent Events) para eventos/alertas em tempo real

---

## ⚙️ Variáveis de ambiente

Crie um arquivo `.env` na raiz do backend. Exemplo:

```ini
# Porta do servidor
PORT=3333

# Origem do front (CORS/SSE)
FRONT_ORIGIN=http://localhost:5173

# JWT
JWT_SECRET=troque-por-uma-chave-forte

# Banco de dados (ex. Postgres)
DATABASE_URL=postgresql://user:pass@localhost:5432/cme?schema=public

# (Opcional) Log / outros
NODE_ENV=development
```

> **Nota:** `FRONT_ORIGIN` é usado em alguns handlers (como o SSE de alertas) para enviar o header `Access-Control-Allow-Origin` correto.

---

## 🚀 Scripts

```bash
# instalar deps
npm i

# gerar tipos do Prisma
npx prisma generate

# aplicar migrações
npx prisma migrate dev

# iniciar em desenvolvimento (com ts-node / nodemon se configurado)
npm run dev

# build + start (produção)
npm run build
npm start
```

> Ajuste os scripts conforme a sua configuração (por exemplo, se usar `ts-node-dev` ou `nodemon`).

---

## 🧭 Estrutura (simplificada)

```
src/
  controllers/
  routes/
  services/
  middlewares/
  events/
  jobs/
  index.ts         # bootstrap do Express
  prisma/          # (se estiver aqui)
```

Principais rotas registradas em `src/routes/index.ts` (exemplo):

- `/auth`
- `/materials`
- `/cycles`
- `/reports`
- `/lotes`
- `/ledger`
- `/users`
- `/search`
- `/events`
- `/api/cycles` (debug)
- `/metrics`
- `/me`
- `/chemicals`
- `/stage-events`
- `/cycles` (aliases de stage-meta)
- `/alerts`
- `/lots`

---

## 🔐 Autenticação

- Todas as rotas protegidas exigem **JWT** via header:  
  `Authorization: Bearer <access_token>`
- **SSE** (EventSource) *não envia headers* → o backend aceita **token via query**:
  - `?token=<access_token>` ou `?access_token=<access_token>`

O middleware `autenticarJWT` lida com ambos (header **ou** query).

---

## 🔄 Refresh de token (opcional)

Se o front usar `/auth/refresh`, o backend deve expor esse endpoint. Ao receber 401, o front pode tentar `POST /auth/refresh` com `{ refreshToken }`. Se falhar, deve **deslogar** o usuário.

---

## 📄 Paginação / Ordenação / Busca

Endpoints de listagem (ex.: `GET /cycles`) aceitam:

- `page` (1‑based), `perPage` (padrão 10)
- `sort` (`timestamp`, `etapa`, `responsavel`), `order` (`asc`|`desc`)
- `q` para busca (nome/código do material, responsável, lote)

Exemplo:
```
GET /cycles?page=1&perPage=10&sort=timestamp&order=desc&q=mayo
```

> **Retorno recomendado:** `{ data, total, page, perPage }`

---

## 🔧 Endpoints principais (resumo)

### Materiais
```
GET    /materials
POST   /materials
GET    /materials/:id
PUT    /materials/:id
DELETE /materials/:id
GET    /materials/:id/history
POST   /materials/:id/history/backfill
```

### Ciclos
```
GET    /cycles
POST   /cycles
GET    /cycles/:id
DELETE /cycles/:id
PATCH  /cycles/:id/stage        # avança/atualiza etapa (envia { etapa, responsavel, observacoes, params? })
GET    /cycles/:id/readiness    # checagens antes de trocar para a próxima etapa
```

### Stage Events & Metadados

- **Por StageEvent ID:**
  ```
  POST /stage-events/:id/wash
  POST /stage-events/:id/disinfection
  POST /stage-events/:id/sterilization
  POST /stage-events/:id/storage
  ```

- **Aliases por ciclo (usa o último StageEvent da etapa solicitada):**
  ```
  POST /cycles/:cycleId/stage-meta/wash
  POST /cycles/:cycleId/stage-meta/disinfection
  POST /cycles/:cycleId/stage-meta/sterilization
  POST /cycles/:cycleId/stage-meta/storage
  ```

- **Leitura para prefill (StageEvent mais recente da etapa solicitada):**
  ```
  GET  /stage-events/:cycleId/stage-meta/:kind
  # kind ∈ wash|disinfection|sterilization|storage
  ```

> **Backend** usa Prisma models `WashEvent`, `DisinfectionEvent`, `SterilizationEvent`, `StorageEvent`. O JSON consolidado também é mantido em `StageEvent.meta` via `mergeMetaJSON(...)`.

### Insumos (Lotes & Tiras de teste)

```
GET /lots/solutions    # ?agent=PERACETICO&limit=50
GET /lots/test-strips  # ?agent=PERACETICO&limit=50
POST /lots/solutions
POST /lots/test-strips
```

### Alertas

```
GET    /alerts                # lista
GET    /alerts/counts         # contadores para badge
GET    /alerts/stats          # KPIs (por dia, tipo, severidade)
PATCH  /alerts/:id/ack        # reconhecer
PATCH  /alerts/:id/resolve    # resolver
GET    /alerts/:id/comments   # listar comentários
POST   /alerts/:id/comments   # adicionar comentário
POST   /alerts/sweep          # varredura programática (cron)
GET    /alerts/stream         # SSE (usar ?token=...)
```

**SSE**: 
```
GET /alerts/stream?token=<access_token>
```
O servidor envia eventos `event: alert` com `data: {...}` para:
- `open`, `ack`, `resolve`, `counts`, `comment`, etc.

### Eventos de Ciclo (SSE)

```
GET /events/cycles?token=<access_token>
```

O servidor emite eventos (`cycle:update`) quando uma etapa é atualizada.

---

## 🧪 Exemplos `curl`

**Login** (exemplo):
```bash
curl -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo","password":"secret"}'
```

**Listar ciclos paginados**:
```bash
curl "http://localhost:3333/cycles?page=1&perPage=5&sort=timestamp&order=desc" \
  -H "Authorization: Bearer $TOKEN"
```

**Anexar metadados de desinfecção (por ciclo, com force)**:
```bash
curl -X POST "http://localhost:3333/cycles/<cycleId>/stage-meta/disinfection?force=1" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "agent":"PERACETICO",
    "concentration":"0.2%",
    "contactMin":10,
    "solutionLotId":"<solutionLotId>",
    "testStripLot":"<stripLotId>",
    "testStripResult":"PASS",
    "activationTime":"10:30",
    "activationLevel":"ATIVO_2",
    "testStripExpiry":"2025-12-31",
    "measuredTempC":22,
    "ph":7.0,
    "notes":"ok"
  }'
```

**SSE (alerts) – teste no navegador (DevTools):**
```js
new EventSource("http://localhost:3333/alerts/stream?token=" + localStorage.getItem("access_token"))
```

---

## 🛠 Troubleshooting

- **401 em SSE** (`/alerts/stream` ou `/events/cycles`)  
  → O `EventSource` não envia header Authorization. Use `?token=<access_token>` e garanta que o `autenticarJWT` faz fallback para query.

- **CORS**  
  → Configure `FRONT_ORIGIN` (ex.: `http://localhost:5173`).

- **Paginação no front não respeitada**  
  → Garanta que o backend aplica `skip/take` e retorna `{ data, total, page, perPage }`.

- **Notas/Concentração obrigatória**  
  → Para agentes `PERACETICO`, `OPA`, `HIPOCLORITO`, o backend exige `concentration`.

---

## ✅ Práticas recomendadas

- Sempre versionar as **migrations** do Prisma.
- Validar DTOs com zod/joi no controller.
- Usar **aliases de etapa por ciclo** só quando necessário; preferir anexar pelo `StageEventId` quando já estiver disponível.
- Padronizar logs e erros JSON para o front.
