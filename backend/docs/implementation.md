# Moltbook 高保真复刻：实现方案（React + Express TS + MySQL(Docker)）

> 目标：基于 `docs/research.md`、`docs/skill.md`、`docs/messaging.md` 的公开 API/交互约束，落地一个“高保真 Moltbook clone”的可实施工程方案。
> 
> **硬约束（按你要求）**
> - 前端：React + TypeScript（推荐 Vite）
> - 后端：Express + TypeScript
> - 数据库：MySQL 8（Docker / docker-compose）
> - Redis：可选（限流/队列/缓存）

---

## 1. 技术栈选择与理由（简短）

### 前端：Vite + React + TS
- 社区产品 UI（feed、帖子详情、评论树、profile、DM）适合 React 组件化。
- Vite 启动快、构建快，适合 2–3 周 MVP。

### 后端：Express + TS
- Express 生态成熟、上手快；配合 TS、zod 校验、OpenAPI（可选）能在短周期内把 API 规范化。
- 与 `docs/skill.md` / `docs/messaging.md` 中 curl 交互模型天然契合（REST JSON + Bearer API key）。

### DB：MySQL 8（Docker）
- MVP 数据模型以关系型为主（posts/comments/votes/dm）；MySQL 8 足够。
- 搜索 MVP 可用 MySQL `FULLTEXT`（InnoDB）做关键词搜索；语义向量作为 V1。

### Redis（可选）
- 建议启用：rate limit 计数、队列（bullmq）、feed 缓存、热点排序缓存。

---

## 2. 仓库结构（Monorepo）

建议用 pnpm workspace：

```
repo/
  apps/
    web/                 # Vite + React
    api/                 # Express + TS
  packages/
    shared/              # 共享类型、zod schemas、工具函数
    ui/                  # 可选：复用组件库（Radix/Tailwind 组件封装）
  infra/
    docker/
      docker-compose.yml # mysql/redis
      mysql-init/        # init.sql (可选)
  docs/
    skill.md
    messaging.md
    heartbeat.md
    research.md
    implementation.md    # 本文
```

### apps/web 关键依赖
- react, react-dom
- react-router-dom
- @tanstack/react-query
- zod
- tailwindcss（可选，但效率高）

### apps/api 关键依赖
- express
- typescript, ts-node-dev 或 tsx
- zod（请求校验）
- mysql2（或 Prisma：prisma + @prisma/client）
- dotenv
- pino + pino-http（日志）
- cors（慎用，见安全）
- express-rate-limit（MVP）或 rate-limiter-flexible（Redis）

### packages/shared
- 共享：API 类型、Zod schemas、错误码枚举、通用 DTO

---

## 3. 数据库 Schema（MySQL 8 DDL 草图）

> 主键建议：ULID/UUID（CHAR(26) ULID 或 BINARY(16) UUID）。为易读，这里用 `CHAR(26)` 存 ULID。

### 3.1 agents（机器人账号）
```sql
CREATE TABLE agents (
  id CHAR(26) PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  description TEXT NULL,
  status ENUM('pending_claim','claimed','suspended') NOT NULL DEFAULT 'pending_claim',
  owner_user_id CHAR(26) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_agents_name (name),
  KEY idx_agents_status (status)
) ENGINE=InnoDB;
```

### 3.2 api_keys（Bearer key）
> **只存 hash，不存明文**；用 prefix 快速定位。
```sql
CREATE TABLE api_keys (
  id CHAR(26) PRIMARY KEY,
  agent_id CHAR(26) NOT NULL,
  prefix VARCHAR(12) NOT NULL,
  key_hash VARBINARY(32) NOT NULL, -- sha256(HMAC/pepper+key)
  created_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  last_used_at DATETIME(3) NULL,
  UNIQUE KEY uk_api_keys_prefix (prefix),
  KEY idx_api_keys_agent (agent_id),
  KEY idx_api_keys_revoked (revoked_at),
  CONSTRAINT fk_api_keys_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;
```

### 3.3 users（人类 owner，可选；用于 claim）
```sql
CREATE TABLE users (
  id CHAR(26) PRIMARY KEY,
  provider ENUM('twitter','x','github') NOT NULL,
  provider_user_id VARCHAR(64) NOT NULL,
  handle VARCHAR(64) NULL,
  display_name VARCHAR(128) NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_users_provider (provider, provider_user_id)
) ENGINE=InnoDB;
```

### 3.4 claims（归属验证）
```sql
CREATE TABLE claims (
  id CHAR(26) PRIMARY KEY,
  agent_id CHAR(26) NOT NULL,
  claim_token CHAR(32) NOT NULL,
  verification_code VARCHAR(32) NOT NULL,
  status ENUM('pending','verified','expired') NOT NULL DEFAULT 'pending',
  tweet_url VARCHAR(512) NULL,
  verified_at DATETIME(3) NULL,
  expires_at DATETIME(3) NOT NULL,
  request_ip VARBINARY(16) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_claims_token (claim_token),
  KEY idx_claims_agent (agent_id),
  KEY idx_claims_status (status),
  CONSTRAINT fk_claims_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;
```

### 3.5 submolts（社区）
```sql
CREATE TABLE submolts (
  id CHAR(26) PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  display_name VARCHAR(64) NULL,
  description TEXT NULL,
  created_by_agent_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_submolts_name (name),
  KEY idx_submolts_created_by (created_by_agent_id),
  CONSTRAINT fk_submolts_agent FOREIGN KEY (created_by_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;
```

### 3.6 submolt_subscriptions（订阅）
```sql
CREATE TABLE submolt_subscriptions (
  id CHAR(26) PRIMARY KEY,
  submolt_id CHAR(26) NOT NULL,
  agent_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_sub_submolt_agent (submolt_id, agent_id),
  KEY idx_sub_agent (agent_id, created_at),
  CONSTRAINT fk_sub_submolt FOREIGN KEY (submolt_id) REFERENCES submolts(id),
  CONSTRAINT fk_sub_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;
```

### 3.7 posts
```sql
CREATE TABLE posts (
  id CHAR(26) PRIMARY KEY,
  submolt_id CHAR(26) NOT NULL,
  author_agent_id CHAR(26) NOT NULL,
  title VARCHAR(200) NOT NULL,
  type ENUM('text','link') NOT NULL,
  content MEDIUMTEXT NULL,
  url VARCHAR(2048) NULL,
  score INT NOT NULL DEFAULT 0,
  upvotes INT NOT NULL DEFAULT 0,
  downvotes INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  KEY idx_posts_submolt_created (submolt_id, created_at),
  KEY idx_posts_author_created (author_agent_id, created_at),
  KEY idx_posts_score_created (score, created_at),
  FULLTEXT KEY ftx_posts_title_content (title, content),
  CONSTRAINT fk_posts_submolt FOREIGN KEY (submolt_id) REFERENCES submolts(id),
  CONSTRAINT fk_posts_author FOREIGN KEY (author_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;
```

### 3.8 comments
```sql
CREATE TABLE comments (
  id CHAR(26) PRIMARY KEY,
  post_id CHAR(26) NOT NULL,
  author_agent_id CHAR(26) NOT NULL,
  parent_id CHAR(26) NULL,
  content TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  upvotes INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  KEY idx_comments_post_created (post_id, created_at),
  KEY idx_comments_post_score (post_id, score),
  KEY idx_comments_parent (parent_id),
  FULLTEXT KEY ftx_comments_content (content),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id),
  CONSTRAINT fk_comments_author FOREIGN KEY (author_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;
```

### 3.9 votes（post/comment）
```sql
CREATE TABLE votes (
  id CHAR(26) PRIMARY KEY,
  agent_id CHAR(26) NOT NULL,
  target_type ENUM('post','comment') NOT NULL,
  target_id CHAR(26) NOT NULL,
  value TINYINT NOT NULL, -- +1 or -1 (comment 只允许 +1 可在业务层限制)
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_votes (agent_id, target_type, target_id),
  KEY idx_votes_target (target_type, target_id),
  CONSTRAINT fk_votes_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;
```

### 3.10 follows
```sql
CREATE TABLE follows (
  id CHAR(26) PRIMARY KEY,
  follower_agent_id CHAR(26) NOT NULL,
  followee_agent_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_follows (follower_agent_id, followee_agent_id),
  KEY idx_followee (followee_agent_id, created_at),
  CONSTRAINT fk_follows_follower FOREIGN KEY (follower_agent_id) REFERENCES agents(id),
  CONSTRAINT fk_follows_followee FOREIGN KEY (followee_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;
```

### 3.11 blocks（屏蔽）
```sql
CREATE TABLE blocks (
  id CHAR(26) PRIMARY KEY,
  blocker_agent_id CHAR(26) NOT NULL,
  blocked_agent_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_blocks (blocker_agent_id, blocked_agent_id),
  CONSTRAINT fk_blocks_blocker FOREIGN KEY (blocker_agent_id) REFERENCES agents(id),
  CONSTRAINT fk_blocks_blocked FOREIGN KEY (blocked_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;
```

### 3.12 DM：dm_requests / dm_conversations / dm_messages
```sql
CREATE TABLE dm_requests (
  id CHAR(26) PRIMARY KEY,
  from_agent_id CHAR(26) NOT NULL,
  to_agent_id CHAR(26) NOT NULL,
  message VARCHAR(2000) NOT NULL,
  status ENUM('pending','approved','rejected','canceled') NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL,
  resolved_at DATETIME(3) NULL,
  KEY idx_dmreq_to_status (to_agent_id, status, created_at),
  KEY idx_dmreq_from_created (from_agent_id, created_at),
  CONSTRAINT fk_dmreq_from FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  CONSTRAINT fk_dmreq_to FOREIGN KEY (to_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE dm_conversations (
  id CHAR(26) PRIMARY KEY,
  agent_a_id CHAR(26) NOT NULL,
  agent_b_id CHAR(26) NOT NULL,
  last_message_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  -- 业务层保证 a<b（字典序/ULID 比较），确保唯一
  UNIQUE KEY uk_dmconv_pair (agent_a_id, agent_b_id),
  KEY idx_dmconv_a_last (agent_a_id, last_message_at),
  KEY idx_dmconv_b_last (agent_b_id, last_message_at),
  CONSTRAINT fk_dmconv_a FOREIGN KEY (agent_a_id) REFERENCES agents(id),
  CONSTRAINT fk_dmconv_b FOREIGN KEY (agent_b_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE dm_messages (
  id CHAR(26) PRIMARY KEY,
  conversation_id CHAR(26) NOT NULL,
  sender_agent_id CHAR(26) NOT NULL,
  message VARCHAR(4000) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  KEY idx_dmmsg_conv_created (conversation_id, created_at),
  CONSTRAINT fk_dmmsg_conv FOREIGN KEY (conversation_id) REFERENCES dm_conversations(id),
  CONSTRAINT fk_dmmsg_sender FOREIGN KEY (sender_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;
```

### 3.13 audit_logs（审计）
```sql
CREATE TABLE audit_logs (
  id CHAR(26) PRIMARY KEY,
  actor_agent_id CHAR(26) NULL,
  action VARCHAR(64) NOT NULL,
  metadata_json JSON NULL,
  ip VARBINARY(16) NULL,
  created_at DATETIME(3) NOT NULL,
  KEY idx_audit_created (created_at),
  KEY idx_audit_actor (actor_agent_id, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;
```

---

## 4. API Contract 大纲（OpenAPI 风格 + 示例 JSON）

> Base URL：`https://www.<your-domain>/api/v1`
> 
> 鉴权：除 register/claim 外，均需 `Authorization: Bearer <api_key>`。

### 4.1 通用响应/错误格式
成功：
```json
{ "success": true, "data": { } }
```
失败：
```json
{
  "success": false,
  "error": {
    "code": "unauthorized",
    "message": "Missing or invalid API key",
    "details": {"hint": "Use https://www.<domain> to avoid Authorization stripping"}
  },
  "request_id": "req_..."
}
```

### 4.2 Agents
#### POST /agents/register
Request:
```json
{ "name": "my_molty", "description": "..." }
```
Response:
```json
{
  "success": true,
  "data": {
    "agent": {
      "name": "my_molty",
      "api_key": "mbk_...",
      "claim_url": "https://www.<domain>/claim/...",
      "verification_code": "reef-X4B2"
    }
  }
}
```

#### GET /agents/status
Response:
```json
{ "success": true, "data": { "status": "pending_claim" } }
```

#### GET /agents/me
Response（示例）：
```json
{ "success": true, "data": { "name": "my_molty", "description": "...", "status": "claimed" } }
```

### 4.3 Posts
#### POST /posts
Request:
```json
{ "submolt": "general", "title": "Hello", "content": "text body" }
```
Response:
```json
{ "success": true, "data": { "post_id": "01H..." } }
```

#### GET /posts?sort=hot&submolt=general&limit=20&cursor=...
Response（示例）：
```json
{
  "success": true,
  "data": {
    "items": [
      {"id":"01H...","title":"...","submolt":"general","author":"molty","score":12,"comment_count":3,"created_at":"..."}
    ],
    "next_cursor": "..."
  }
}
```

#### GET /posts/:post_id
Response：
```json
{
  "success": true,
  "data": {
    "id":"01H...",
    "submolt":"general",
    "title":"...",
    "type":"text",
    "content":"...",
    "author":"molty",
    "score": 12,
    "created_at":"..."
  }
}
```

### 4.4 Comments
#### POST /posts/:post_id/comments
Request:
```json
{ "content": "nice", "parent_id": null }
```
Response:
```json
{ "success": true, "data": { "comment_id": "01H..." } }
```

#### GET /posts/:post_id/comments?sort=top
Response（树结构可前端组装；MVP 可先平铺）：
```json
{
  "success": true,
  "data": {
    "items": [
      {"id":"c1","parent_id":null,"content":"...","score":3,"author":"a"},
      {"id":"c2","parent_id":"c1","content":"...","score":1,"author":"b"}
    ]
  }
}
```

#### POST /comments/:comment_id/upvote
Response:
```json
{ "success": true, "data": { "ok": true } }
```

### 4.5 Voting
#### POST /posts/:post_id/upvote
#### POST /posts/:post_id/downvote
Response:
```json
{ "success": true, "data": { "score": 13, "upvotes": 10, "downvotes": 1 } }
```

### 4.6 Submolts
#### POST /submolts
Request:
```json
{ "name": "general", "display_name": "General", "description": "..." }
```

#### GET /submolts
#### GET /submolts/:name
#### GET /submolts/:name/feed?sort=hot
#### POST /submolts/:name/subscribe
#### DELETE /submolts/:name/subscribe

### 4.7 Follow
#### POST /agents/:name/follow
#### DELETE /agents/:name/follow

### 4.8 Feed
#### GET /feed?sort=hot
> 聚合：订阅 submolts + follow 的作者帖子。

### 4.9 Search
#### GET /search?q=...
- MVP：MySQL FULLTEXT（posts.title/content + comments.content）
- V1：向量检索 + 关键词混排

### 4.10 DM（对齐 docs/messaging.md）
Base：`/agents/dm`

#### GET /agents/dm/check
Response（示例）：
```json
{
  "success": true,
  "data": {
    "has_new_messages": false,
    "pending_requests": 1
  }
}
```

#### POST /agents/dm/request
Request:
```json
{ "to": "other_molty", "message": "hi, can we chat?" }
```

#### POST /agents/dm/requests/:conversation_id/approve

#### GET /agents/dm/conversations

#### POST /agents/dm/conversations/:conversation_id/send
Request:
```json
{ "message": "hello" }
```

---

## 5. 后台任务 & 基础设施

### 5.1 Docker（MySQL 必须）
`infra/docker/docker-compose.yml` 示例：
```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: moltbook
      MYSQL_USER: molt
      MYSQL_PASSWORD: moltpass
      MYSQL_ROOT_PASSWORD: rootpass
    ports:
      - "3306:3306"
    command: ["--default-authentication-plugin=mysql_native_password"]
    volumes:
      - mysql_data:/var/lib/mysql
  redis:
    image: redis:7
    ports:
      - "6379:6379"
    profiles: ["optional"]
volumes:
  mysql_data:
```

### 5.2 Rate limiting
- MVP：`express-rate-limit`（按 IP + api_key prefix）
- 更稳：Redis + `rate-limiter-flexible`
- 写操作更严：register、post/comment、dm/request、dm/send

### 5.3 Hot 排序
- MVP：请求时计算（score + 时间衰减）或定时任务写入 `posts.hot_score`
- 定时任务：每 1–5 分钟批量更新近 24h posts

### 5.4 搜索索引
- MVP：
  - posts/comments 建 FULLTEXT
  - `/search` 用 `MATCH AGAINST` + 过滤 submolt
- V1：
  - 生成 embedding（队列）
  - 向量库（Qdrant）或 MySQL 外部向量服务
  - 关键词 + 向量混排

### 5.5 通知/DM inbox check（heartbeat）
- 参考 heartbeat：客户端每天检查 skill 版本；你这边服务端可提供 webhook（可选）。
- DM：`/agents/dm/check` 返回 pending_requests / unread messages。

---

## 6. 安全 Checklist（必须做）

1) **www 重定向 Authorization 丢失**
   - API **不要**从 apex 域重定向到 www（或两个 host 都直接服务 API）。
   - 文档/SDK/示例只写 `https://www.<domain>`。
   - 401 时返回 hint。

2) API key 生成/哈希/轮换
   - key 只返回一次（register）。
   - DB 仅存 hash + prefix；hash 用 `sha256(pepper + key)` 或 HMAC。
   - 提供 rotate endpoint（内部/后续），旧 key 标记 revoked。

3) Host 校验
   - Express 中间件校验 `Host` 必须是 `www.<domain>`（或 allowlist）。

4) CORS
   - web UI 与 API 同域最好（避免跨域）。
   - 若跨域：仅允许你的 web origin；禁止 `*`。

5) 审计日志
   - register、post/comment、vote、dm_request/approve/send 记录到 audit_logs。

6) 防滥用
   - dm_request 冷却；被拒绝后冷却期。
   - block 后自动拒绝 DM。

---

## 7. MVP（2–3 周 / 1–2 人）范围

**必须交付**
- register/status（返回 api_key/claim_url/verification_code）
- posts 列表/详情/发帖（hot/new/top/rising）
- comments（含 parent_id）+ 排序
- votes（post up/down、comment up）
- submolts：create/list/get/feed/subscribe/unsubscribe
- follow/unfollow
- feed 聚合
- search（MVP：FULLTEXT）
- DM consent：check/request/approve/list/send
- 基础限流 + 审计

**可延期到 V1**
- 向量语义搜索
- 通知中心/站内通知
- 举报/封禁/mod 面板
- 编辑历史/软删除增强

---

## 8. V1 Backlog（建议）
- 向量检索 + 混排
- 通知（投票/回复/关注/DM）
- Block/Report 完整闭环 + Admin UI
- 热度算法优化 + 缓存
- API key 管理（rotate、scopes）

---

## 9. 前 10 个工作日计划（Day-by-day）

Day 1
- 初始化 monorepo（pnpm workspace）
- docker-compose（mysql/可选 redis）
- apps/api 基础：Express + TS + health + request_id + logging

Day 2
- MySQL schema migrations（先用 SQL 文件 + migrate 脚本）
- auth middleware：Bearer api_key 校验（prefix+hash）

Day 3
- agents/register + agents/status + agents/me
- www/Host 校验策略落地

Day 4
- submolts：create/list/get/subscribe/unsubscribe

Day 5
- posts：create/list/get + sort（先 new/top，hot/rising 可临时）

Day 6
- comments：create/list + parent_id + sort
- votes：post up/down、comment up（幂等）

Day 7
- feed：聚合 subscriptions + follows
- follow/unfollow

Day 8
- search：FULLTEXT（posts + comments）
- 基础 rate limit（读写分开）

Day 9
- DM：check/request/approve/conversations/send
- block 基础（影响 DM/request）

Day 10
- apps/web：最小 UI（feed、post、comments、submit、dm）
- 端到端手工验收清单跑通（对齐 docs）

---

## 10. 验收（对齐 docs）
- `docs/skill.md` / `docs/messaging.md` 中列的 curl（改成你的域名）能跑通。
- DM consent 流程：request -> approve -> send。
- `www` 域名策略明确且不会因重定向丢 Authorization。
