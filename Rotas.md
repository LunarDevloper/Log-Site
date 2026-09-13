# BuddyLog — servidor

API HTTP (Express) para grupos, estoque e cargos. Auth no **Supabase**; dados de domínio no **Neon (Lakebase Postgres)**. Redis é cache opcional (`REDIS_URL`); se estiver fora, as rotas seguem sem cache.

Subida: `npm run dev` (watch) ou `npm start`. Env: `Source/.env`. Default `http://localhost:3000`.

O frontend deve chamar a API com `credentials: 'include'` (cookies httpOnly). JSON até **64kb**. Helmet + CORS (`CLIENT_URL`, credentials). `trust proxy` ligado.

Não há rotas HTTP para `robots` / `robot_logs` (existem no banco).

---

## Variáveis de ambiente

| Nome | Uso |
|------|-----|
| `PORT` | Porta (default `3000`) |
| `NODE_ENV` | `production` → cookie `Secure` + `SameSite=None` |
| `SUPABASE_URL` | Projeto Auth |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publishable/anon |
| `DATABASE_URL` | Postgres Neon (domínio) |
| `REDIS_URL` | Cache opcional |
| `CLIENT_URL` | Origem CORS e redirect pós-login (site) |
| `AUTH_CALLBACK_URL` | Redirect OAuth/e-mail → API (`…/auth/callback`) |
| `AUTH_SUCCESS_URL` | Opcional; override do redirect depois da sessão |

`AUTH_CALLBACK_URL` tem que estar nas Redirect URLs do Supabase. Google Cloud usa a callback **do Supabase** (`https://<ref>.supabase.co/auth/v1/callback`), não a do Express.

Na Vercel o app vira uma Function (`index.ts` exporta o Express). `NODE_ENV=production` já vem da plataforma. **Não** defina `REDIS_URL` (localhost não existe lá). Depois do domínio `*.vercel.app`:

1. Settings → Environment Variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `CLIENT_URL=https://<projeto>.vercel.app`, `AUTH_CALLBACK_URL=https://<projeto>.vercel.app/auth/callback`
2. Redeploy
3. Supabase Redirect URLs: a mesma `AUTH_CALLBACK_URL`

Importar o GitHub: [vercel.com/new](https://vercel.com/new) → `LunarDevloper/BuddyLog2`.

---

## Convenções

Erros: `{ "error": "…" }`.

| Status | Significado |
|--------|-------------|
| 400 | Body/validação |
| 401 | Sem sessão |
| 403 | Sem permissão / hierarquia |
| 404 | Recurso inexistente (rota desconhecida: `{ "error": "Not found" }`) |
| 429 | Rate limit |
| 500 | `{ "error": "Internal Server Error" }` |
| 503 | `/health` sem banco |

`groupId` e IDs de usuário/cargo/item no path são **UUID**. Nome no path de item também é aceito em get item/histórico.

Campos de body costumam aceitar camelCase e PascalCase (`name` / `Name`, `userId` / `UserID`).

Timestamps nas respostas de grupo/histórico: **Unix ms**. Em listagem de cargos, `created_at` vem ISO do banco.

Sessão: cookies httpOnly, `path=/`. Dev: `SameSite=Lax`. Produção: `None` + `Secure`.

Rate limit:

| Onde | Limite |
|------|--------|
| Signup, login, `POST /auth/session` | 5 / 15 min |
| `GET /auth/google` | 10 / 15 min |
| `POST /groups/create` | 10 / hora |
| Demais `/groups` | 30 / 15 min |

---

## Limites de domínio

| Recurso | Limite |
|---------|--------|
| Email | 254 |
| Senha | 6–72 |
| Nome do grupo | 64 |
| Descrição do grupo | 500 |
| Nome do item / cargo | 32 |
| Descrição do item | 1000 |
| Itens por grupo | 100 |
| Cargos por grupo | 20 |
| Quantidade / estoque de segurança | 0–100000 |
| Histórico | últimos 100 |

Rank: inteiro ≥ 0. **Menor rank = mais autoridade.** Rank **único** por grupo. Admin do grupo nasce com rank `0` e todas as perms.

Owner do grupo não troca de cargo nem é removido.

Só se atribui a outro cargo perms que o ator já tem, e só rank **estritamente maior** que o do ator (`minRank` = rank do ator + 1).

---

## Permissões

```json
{
  "CreateItem": false,
  "DeleteItem": false,
  "AddItemToInventory": false,
  "RemoveItemFromInventory": false,
  "ViewInventory": false,
  "ViewItemHistory": false,
  "CreateRole": false,
  "AddRole": false,
  "RemoveRole": false
}
```

`LowStock`: `minimum_stock > 0` e `quantity <= minimum_stock`.

---

## Saúde e raiz

### `GET /health`

Sem auth. Ping no Neon.

**200** `{ "ok": true }` · **503** `{ "ok": false }`

### `GET /`

Mesmo handler de `GET /auth/callback` (link de e-mail do Supabase cai na Site URL).

---

## Auth — `/auth`

Objeto `user` comum:

```json
{
  "id": "uuid",
  "email": "rafael@email.com",
  "displayName": "Rafael",
  "avatarUrl": null,
  "providers": ["email"]
}
```

Toda rota autenticada sincroniza `profiles` no Neon se faltar.

### `POST /auth/signup`

Cria usuário no Supabase e `profiles` no Neon.

| Campo | Obrigatório |
|-------|-------------|
| `email` | sim |
| `password` | sim |
| `displayName` | não (default: parte antes do `@`) |

**201** `{ "user", "sessionCreated", "message" }`

Confirmação de e-mail ligada → `sessionCreated: false`. E-mail já cadastrado (identities vazias) → **409**.

`emailRedirectTo` = `AUTH_CALLBACK_URL`.

### `POST /auth/login`

**200** `{ "user", "expiresAt" }` (`expiresAt` Unix s ou `null`) · **401** credenciais.

### `GET /auth/google`

**303** para o Google (`redirectTo` = `AUTH_CALLBACK_URL`). Testar no **navegador**. **500** se o provider não estiver configurado.

### `GET /auth/callback`

Query: `code` (OAuth/PKCE), ou `token_hash` + `type` (e-mail). Hash `#access_token` usa `confirm-hash.js` + `POST /auth/session`.

Sucesso: **303** para `AUTH_SUCCESS_URL` ou `CLIENT_URL`. Se `CLIENT_URL` for a raiz desta API, redireciona para `/auth/me`. Sem URL de site: HTML ou `{ "authenticated": true }`.

Erros OAuth: `error` / `error_description`.

### `GET /auth/confirm-hash.js`

Script interno do fluxo implícito de e-mail. Não chamar à mão.

### `POST /auth/session`

Body: `access_token`, `refresh_token`. Grava cookie. **200** `{ "authenticated": true }`.

### `POST /auth/logout`

**200** `{ "ok": true }`

### `GET /auth/me`

Auth. **200** `{ "user" }` · **401**.

---

## Grupos — `/groups`

Todas exigem auth, salvo o que estiver dito. `:groupId` UUID.

### `POST /groups/create`

```json
{ "name": "Depósito A", "description": "Estoque principal" }
```

Cria grupo, cargo Admin (rank 0, todas as perms) e coloca o usuário como owner.

**201**

```json
{
  "id": "uuid",
  "name": "Depósito A",
  "description": "Estoque principal",
  "owner": { "UID": "uuid", "DisplayName": "Rafael" },
  "members": ["uuid"],
  "createdAt": 1730000000000,
  "updatedAt": 1730000000000
}
```

**400** nome/descrição ausentes ou `Unable to create group`.

### `GET /groups/listgroups`

Grupos em que o usuário é membro.

**200** `{ "groups": [{ "id", "name", "description", "ownerId", "createdAt", "updatedAt" }] }`

### `GET /groups/:groupId`

Membro. Mesmo formato de criar (com `owner` e `members`).

**404** grupo · **403** não membro.

### `GET /groups/:groupId/roles`

Membro. **200** `{ "roles": [{ "id", "group_id", "name", "rank", "perms", "created_at" }] }`

---

## Inventário

Typo no path: **`getinvetory`** (sem `n`).

### `GET /groups/getinvetory/:groupId`

Perm: `ViewInventory`.

**200**

```json
{
  "inventory": {
    "Items": [
      {
        "UID": "uuid",
        "DisplayName": "Parafuso M6",
        "Description": "Sextavado 6mm",
        "Amount": 150,
        "SecurityLimit": 20,
        "LowStock": false
      }
    ]
  }
}
```

### `GET /groups/getlowstock/:groupId`

Perm: `ViewInventory`. Só itens em estoque baixo. Mesmo formato.

### `GET /groups/getitem/:groupId/:itemid`

Perm: `ViewInventory`. `:itemid` = UUID ou nome.

**200** `{ "item": { … } }` · **404** item.

### `GET /groups/gethistory/:groupId`

Perm: `ViewItemHistory`. Até 100 movimentos do grupo.

**200**

```json
{
  "history": [
    {
      "Id": "uuid",
      "ItemUID": "uuid",
      "ItemName": "Parafuso M6",
      "UserID": "uuid",
      "Type": "add",
      "Quantity": 10,
      "CreatedAt": 1730000000000
    }
  ]
}
```

`Type`: `add` | `remove` (e o que o banco gravar).

### `GET /groups/getitemhistory/:groupId/:itemid`

Perm: `ViewItemHistory`. Mesmo `history`. `:itemid` UUID ou nome.

### `POST /groups/:groupId/items`

Perm: `CreateItem`. `name`/`ItemName`, `description`/`Description`.

**201** `{ "uid", "groupId" }` · **400** `Unable to create item` (nome duplicado devolve o uid existente).

### `PATCH /groups/:groupId/items`

Perm: `CreateItem`. Identifica por `name` / `UID` / `itemId`. Atualiza descrição e estoque de segurança (`SecurityLimit` / `minimumStock` / `minimum_stock`, inteiro).

**200** `{ "ok": true, "item": { … } }`

### `DELETE /groups/:groupId/items`

Perm: `DeleteItem`. `{ "name": "Parafuso M6" }`.

**200** `{ "ok": true }` · **404** item.

### `POST /groups/:groupId/inventory/add`

Perm: `AddItemToInventory`. `amount`/`Amount` inteiro. Item: `itemId`/`UID` ou `name`/`ItemName`.

Grava `inventory_history` + `audit_logs`.

**200** `{ "ok": true, "item": { … }, "lowStock": false }`

### `POST /groups/:groupId/inventory/remove`

Perm: `RemoveItemFromInventory`. Mesmo body. Não deixa quantidade negativa.

**200** `{ "ok": true, "item": { … }, "lowStock": true }`

---

## Cargos e membros

### `GET /groups/getpermissions/:groupId`

Membro. **200** `{ "permissions": { … } }` · **403** se não for membro.

### `GET /groups/getassignableperms/:groupId`

Membro. Perms que este cargo pode colocar em outro + `keys` + `minRank`.

**200**

```json
{
  "keys": ["CreateItem", "DeleteItem", "AddItemToInventory", "RemoveItemFromInventory", "ViewInventory", "ViewItemHistory", "CreateRole", "AddRole", "RemoveRole"],
  "assignable": { "CreateItem": true, "DeleteItem": false },
  "minRank": 11
}
```

### `POST /groups/:groupId/roles`

Perm: `CreateRole` + hierarquia.

```json
{
  "name": "Operador",
  "rank": 10,
  "perms": {
    "CreateItem": false,
    "DeleteItem": false,
    "AddItemToInventory": true,
    "RemoveItemFromInventory": true,
    "ViewInventory": true,
    "ViewItemHistory": false,
    "CreateRole": false,
    "AddRole": false,
    "RemoveRole": false
  }
}
```

`perms` precisa das **9** chaves booleanas. **201** `{ "id": "uuid" }`.

### `PATCH /groups/:groupId/roles/:roleId`

Perm: `CreateRole`. `perms` obrigatório; `name` e `rank` opcionais. Não edita cargo de rank igual ou superior.

**200** `{ "ok": true }`

### `DELETE /groups/:groupId/roles/:roleId`

Perm: `RemoveRole`. Falha se ainda houver membros com o cargo.

**200** `{ "ok": true }`

### `GET /groups/:groupId/members`

Membro. Lista membros com cargo, perms e se é owner.

**200**
```json
{
  "members": [
    {
      "userId": "uuid",
      "displayName": "Rafael",
      "avatarUrl": null,
      "joinedAt": 1730000000000,
      "isOwner": true,
      "role": {
        "id": "uuid",
        "name": "Admin",
        "rank": 0,
        "perms": {
          "CreateItem": true,
          "DeleteItem": true,
          "AddItemToInventory": true,
          "RemoveItemFromInventory": true,
          "ViewInventory": true,
          "ViewItemHistory": true,
          "CreateRole": true,
          "AddRole": true,
          "RemoveRole": true
        }
      }
    }
  ]
}
```

### `GET /groups/:groupId/members/:userId`

Membro. Um membro do grupo.

**200** `{ "member": { … } }` · **404** membro.

### `POST /groups/:groupId/members/role`

Perm: `AddRole`. Membro **já no grupo**. Não altera o owner.

```json
{ "userId": "uuid", "roleId": "uuid" }
```

**200** `{ "ok": true }`

### `POST /groups/:groupId/members`

Perm: `AddRole`. Usuário já precisa ter `profile` no Neon. Cargo gerenciável pelo ator.

```json
{ "userId": "uuid", "roleId": "uuid" }
```

**201** `{ "ok": true }`

### `DELETE /groups/:groupId/members`

```json
{ "userId": "uuid" }
```

Owner não sai. Sair do próprio grupo: sem `AddRole`. Tirar outra pessoa: `AddRole` e rank menor que o alvo.

**200** `{ "ok": true }` · **404** membro.

---

## Índice de rotas

| Método | Path | Auth |
|--------|------|------|
| GET | `/health` | não |
| GET | `/` | callback |
| POST | `/auth/signup` | não |
| POST | `/auth/login` | não |
| GET | `/auth/google` | não |
| GET | `/auth/callback` | callback |
| GET | `/auth/confirm-hash.js` | não |
| POST | `/auth/session` | não |
| POST | `/auth/logout` | cookie |
| GET | `/auth/me` | sim |
| POST | `/groups/create` | sim |
| GET | `/groups/listgroups` | sim |
| GET | `/groups/getinvetory/:groupId` | sim + perm |
| GET | `/groups/getlowstock/:groupId` | sim + perm |
| GET | `/groups/gethistory/:groupId` | sim + perm |
| GET | `/groups/getitem/:groupId/:itemid` | sim + perm |
| GET | `/groups/getitemhistory/:groupId/:itemid` | sim + perm |
| GET | `/groups/getpermissions/:groupId` | sim (membro) |
| GET | `/groups/getassignableperms/:groupId` | sim (membro) |
| GET | `/groups/:groupId/roles` | sim (membro) |
| GET | `/groups/:groupId/members` | sim (membro) |
| GET | `/groups/:groupId/members/:userId` | sim (membro) |
| GET | `/groups/:groupId` | sim (membro) |
| POST | `/groups/:groupId/items` | sim + perm |
| PATCH | `/groups/:groupId/items` | sim + perm |
| DELETE | `/groups/:groupId/items` | sim + perm |
| POST | `/groups/:groupId/inventory/add` | sim + perm |
| POST | `/groups/:groupId/inventory/remove` | sim + perm |
| POST | `/groups/:groupId/roles` | sim + perm |
| PATCH | `/groups/:groupId/roles/:roleId` | sim + perm |
| DELETE | `/groups/:groupId/roles/:roleId` | sim + perm |
| POST | `/groups/:groupId/members/role` | sim + perm |
| POST | `/groups/:groupId/members` | sim + perm |
| DELETE | `/groups/:groupId/members` | sim (regras acima) |
