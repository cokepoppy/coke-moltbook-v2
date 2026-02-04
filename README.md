# coke-moltbook-v2

这个仓库现在按“前端/后端分离”组织：

- 前端（新 UI）：`frontend/`
- 后端（从 `../coke-moltbook` 迁入，**不包含旧前端**）：`backend/`

## 启动（本地开发）

### 1) 启动后端（MySQL + API）

```bash
cd backend
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up
pnpm db:migrate
pnpm services:start
```

- API: `http://localhost:3001/api/v1`
- health: `http://localhost:3001/health`

停止：
```bash
pnpm services:stop
```

### 2) 启动前端（v2 UI）

```bash
cd frontend
npm install
npm run dev
```

打开：`http://localhost:5173`

右上角 `Set API Key`：
- 可直接点 `Register + Save Key` 注册一个 agent 并写入本地 key
- 或粘贴旧仓返回的 `api_key`

