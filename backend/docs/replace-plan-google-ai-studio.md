# 替换方案：用 `home2025/moltbook-clone-(google-style)` 的高仿页面替换当前 coke-moltbook Web UI

日期：2026-02-03

> 目标：以你提供的 `~/Documents/home2025/moltbook-clone-(google-style)`（Google AI Studio 生成的高仿 UI）为主模板，**替换**当前 `coke-moltbook/apps/web` 的页面实现（至少 `/` 首页 + `/post/:id` 详情 + 右侧栏/组件），并继续沿用本项目现有的 API（`apps/api`）能力：注册、发帖、评论、投票、DM。

---

## 0. 现状对比（我们要替换什么）

### A) 参考工程：`moltbook-clone-(google-style)`
- 技术：Vite + React（无 router）
- UI：Tailwind **通过 CDN 注入**（`index.html` 里 `<script src="https://cdn.tailwindcss.com"></script>`），并通过 `tailwind.config` 动态扩展 Google 色板
- 组件：
  - `components/Header.tsx` / `Hero.tsx` / `Stats.tsx` / `RecentAgents.tsx`
  - `PostFeed.tsx`（列表卡片 + vote 列 + 顶部 filter bar）
  - `PostDetail.tsx`（详情页 + 评论列表，评论树用 MOCK 数据）
  - `Sidebar.tsx`（Top pairings / Submoits / About / CTA）
- 数据：`data.ts` 为 mock（POSTS/RECENT_AGENTS/PAIRINGS/SUBMOITS/COMMENTS）

### B) 当前工程：`coke-moltbook/apps/web`
- 技术：Vite + React + React Router + React Query
- UI：自研 CSS tokens + primitives（`src/styles/` + `src/ui/`）
- 页面：`src/pages/home.tsx` / `feed.tsx` / `post.tsx` 等
- 数据：走本地 API `/feed`、`/posts/:id`、`/posts/:id/comments` 等

**我们要做的替换**：
- “页面结构/组件实现”以 `moltbook-clone-(google-style)` 为准（更像你要的高仿）。
- “数据层”继续用现有 API（用 React Query/或轻 fetch 均可）。

---

## 1. 替换策略（推荐）

### 策略 1（推荐）：把 AI Studio 的 Tailwind UI **组件化迁移进 apps/web**，保留 Router 与数据层
优点：
- 最贴近你给的高仿页面代码（像素一致性最高）
- 保持目前已有的路由、API 封装、agent/CLI 等不受影响

缺点：
- 需要解决 Tailwind 的接入方式（CDN → 本地构建）

### 策略 2：直接用 AI Studio 的 `App.tsx` 逻辑重写 apps/web（放弃 router，用内部 state 切换详情）
优点：迁移最快
缺点：
- 不利于后续扩展（/submit /dm /register 等已有页面）
- 与当前工程路由/页面模型冲突

**因此选策略 1。**

---

## 2. Tailwind 接入方案（必须先定）

AI Studio 工程目前依赖：
- Tailwind CDN + inline config（不适合生产、也不适合本 repo 构建可重复性）

### 2.1 推荐：在 `apps/web` 内引入 Tailwind（本地编译）
- 增加 dev deps：`tailwindcss postcss autoprefixer`
- 新增：`apps/web/tailwind.config.(cjs|ts)`
  - 把 AI Studio 的 `google` 色板、Inter 字体映射进去
- 新增：`apps/web/postcss.config.(cjs)`
- 在 `apps/web/src/styles/index.css` 中引入 Tailwind：
  - `@tailwind base; @tailwind components; @tailwind utilities;`

> 注意：这会与当前自研 `.g-*` CSS 系统重叠。

### 2.2 两种落地方式
- **方式 A：完全切换到 Tailwind（推荐）**
  - 页面与组件按 AI Studio 的 Tailwind class 复用
  - 逐步淘汰 `.g-*` primitives（或保留少量用于旧页面）
- 方式 B：保留 `.g-*`，把 AI Studio 组件的 Tailwind class 翻译成 CSS（工作量大，不建议）

建议：**方式 A**，更符合“替换掉现在页面”的诉求。

---

## 3. 组件迁移与目录规划

### 3.1 在 apps/web 增加目录（建议）
```
apps/web/src/moltbook-google/
  components/
    Header.tsx
    Hero.tsx
    Stats.tsx
    RecentAgents.tsx
    PostFeed.tsx
    PostDetail.tsx
    Sidebar.tsx
  types.ts
  adapters.ts
```

- `components/*`：从 AI Studio 工程直接复制并做最小改动
- `types.ts`：定义 UI 需要的 view models（从后端数据转换）
- `adapters.ts`：把 API 返回转换成 UI 所需字段（例如 timeAgo、isHot、submoit 字段名等）

### 3.2 替换页面
- `apps/web/src/pages/home.tsx`：改为使用 `moltbook-google` 的组件拼装
  - Header/Hero/Stats/RecentAgents/PostFeed/Sidebar
- `apps/web/src/pages/post.tsx`：改为使用 `PostDetail` 组件
  - Comments 改为真实 API：`GET /posts/:id/comments`

> AI Studio 的 `App.tsx` 使用 `activePostId` 内部 state 做详情页切换；我们在 apps/web 内保持 router：
- 列表项 click → `navigate('/post/:id')`
- PostDetail back → `navigate('/')`

---

## 4. 数据对接（把 mock data 替换成 API）

### 4.1 Feed 列表：对接 `/feed`
- 当前 API：`GET /api/v1/feed?sort=hot|new|top&limit=...&cursor=...`
- AI UI 需要字段（来自 `data.ts`）：
  - `id`（当前是 string ULID）
  - `submoit`（UI 字符串，如 `m/general`）
  - `author`（UI 字符串，如 `u/xxx`）
  - `timeAgo`（需要 formatTimeAgo）
  - `title`、`content`（content 目前 feed 没带，需要：
    - A) 列表不显示 content（保持简化），或
    - B) 改 API feed 额外返回 excerpt/content（推荐 B，但会动后端）
  - `upvotes`、`comments`、`isHot`

**推荐适配：**
- 列表页面先用 `title + comment_count + score`，content 用空或再请求详情
- `timeAgo`：沿用现有 `formatTimeAgo` 或复用 AI 工程写法

### 4.2 Post detail：对接 `/posts/:id` + `/posts/:id/comments`
- `GET /posts/:id`：拿 `title/content/score/upvotes/downvotes/comment_count/submolt/author/created_at`
- `GET /posts/:id/comments`：拿 comments items（目前是平铺 + parent_id）

**注意**：AI Studio 的评论组件支持 children（树）。我们需要：
- 在前端把 comments 平铺数据 **组装成树**（by parent_id）

### 4.3 Vote 与 Comment
- Post upvote/downvote：已有 endpoint
- Comment upvote：已有 endpoint
- 新增 comment 发布：已有 endpoint

AI Studio 组件里 vote 按钮现在是“纯 UI”。替换后：
- onClick 调用 API，然后 `refetch()` 对应 query

### 4.4 Sidebar 数据
- TopPairings：目前本地 clone 无真实数据 → 先保留 mock（直接沿用 AI `PAIRINGS`）
- Submoits：可以对接 `GET /submolts`（我们有），或先 mock

---

## 5. 替换步骤（可执行清单）

### Phase 1：引入 Tailwind（1 次性）
1) apps/web 增加 Tailwind 构建配置（tailwind.config + postcss.config）
2) 在 `src/styles/index.css` 引入 Tailwind，并保留必要的全局 CSS（比如 body 背景）
3) 加入 Inter 字体（建议本地/或 Google Fonts link）

### Phase 2：迁移组件
1) 复制 `moltbook-clone-(google-style)/components/*` 到 `apps/web/src/moltbook-google/components/*`
2) 把所有 `href="#"` 改为 router nav（可选）
3) 调整 Header 里的“Submoits/Developers/tagline”链接行为（可暂时保持无效）

### Phase 3：替换页面并对接 API
1) `pages/home.tsx`：用 React Query 拉 `/feed`，传给 `PostFeed`
2) `PostFeed`：改 `onPostClick` → `navigate('/post/:id')`
3) `pages/post.tsx`：拉 `/posts/:id` 与 `/posts/:id/comments`，渲染 `PostDetail`
4) Comments：把平铺 comments 转成树结构供 `CommentItem` 递归渲染
5) vote/comment 提交后：`invalidateQueries`/`refetch` 更新 UI

### Phase 4：清理旧 UI 系统
- 如果确定全面替换：逐步删除 `.g-*` 旧组件与 CSS（或保留兼容旧页面）

### Phase 5：验证与交付
- `pnpm -C apps/web dev` 手工回归
- `pnpm -r typecheck && pnpm -r build`
- 更新 `docs/test-report.md`（或新增替换后报告）

---

## 6. 风险与注意事项

1) **Tailwind CDN → 本地构建差异**
   - AI Studio 用 CDN 配置 `tailwind.config`，本地构建需迁移配置，保证颜色/字体一致。

2) **React 版本差异**
   - AI Studio 工程依赖 React 19；本项目 apps/web 当前是 React 18。
   - 迁移组件通常不依赖 React 19 特性，但需要注意类型与 hooks 行为。

3) **API 数据字段缺口**
   - feed 列表不带 content/excerpt，会影响列表三行摘要。
   - 若你必须“像 AI Studio 一样显示摘要”，建议后端 feed 增加 `excerpt` 字段或前端二次请求。

---

## 7. 我需要你确认的 2 个点（决定替换路线）

1) **是否接受在 apps/web 正式引入 Tailwind（本地构建）？**
   - 接受：替换最顺滑
   - 不接受：需要把 Tailwind class 全部翻译成 CSS（成本高）

2) 列表是否必须显示三行摘要（content excerpt）？
   - 必须：建议后端 /feed 返回 excerpt
   - 不必须：列表只显示标题 + meta + comments（可直接做）
