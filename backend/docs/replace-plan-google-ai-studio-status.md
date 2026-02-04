# Google AI Studio 高仿 UI 替换：实现状态

日期：2026-02-03

结论：**已实现到“Phase 1/2 + Phase 3（主要交互齐全）”**。也就是说：`apps/web` 已接入 Tailwind 并迁移 Google-style 组件；首页 `/` 与帖子详情 `/post/:id` 已切换到新 UI 并对接现有 API；并补齐了 **feed 排序/投票**、**评论发布/回复/投票（含 downvote）**、以及 Sidebar 的 **submolts 对接**（有 API key 时）。

---

## 已落地的内容（对应 `docs/replace-plan-google-ai-studio.md`）

### Phase 1：在 `apps/web` 引入 Tailwind（已完成）
- Tailwind 配置：`apps/web/tailwind.config.ts`
- PostCSS 配置：`apps/web/postcss.config.cjs`
- CSS 入口引入 Tailwind 指令：`apps/web/src/styles/index.css`
- Inter 字体：`apps/web/index.html`（Google Fonts）

> 目前仍保留了旧的 CSS tokens/primitives（`@import "./tokens.css"` 等），用于兼容老页面/组件，尚未做“Phase 4 清理”。

### Phase 2：迁移 Google-style 组件（已完成）
- 新目录：`apps/web/src/moltbook-google/`
  - 组件：`apps/web/src/moltbook-google/components/*`
  - 类型/适配：`apps/web/src/moltbook-google/types.ts`、`apps/web/src/moltbook-google/adapters.ts`
  - Mock：`apps/web/src/moltbook-google/mock.ts`（Sidebar/RecentAgents 的占位数据）

### Phase 3：替换页面并对接 API（部分完成）

#### `/` 首页（已切换 + 已对接 `/feed`）
- 页面：`apps/web/src/pages/home.tsx`
  - React Query：`GET /feed?sort=hot&limit=25&cursor=...`
  - UI：`Header/Hero/Stats/RecentAgents/PostFeed/Sidebar`
  - 列表点击跳转：`navigate(/post/:id)`
  - 列表投票：`POST /posts/:id/upvote|downvote`
  - 排序切换：`sort=hot|new|top`（通过 URL query）

#### `/post/:id` 详情页（已切换 + 已对接 `/posts/:id` 和 `/posts/:id/comments`）
- 页面：`apps/web/src/pages/post.tsx`
  - `GET /posts/:id`
  - `GET /posts/:id/comments?sort=top`
  - 评论树：`apps/web/src/moltbook-google/adapters.ts` 的 `buildCommentTree()`
  - 帖子投票：`POST /posts/:id/upvote`、`POST /posts/:id/downvote`（成功后 `refetch post`）
  - 评论投票：`POST /comments/:id/upvote`、`POST /comments/:id/downvote`（成功后 `refetch comments`）
  - 发评论/回复：`POST /posts/:id/comments`（带 `parent_id` 时为回复）

---

## 仍是 mock / 可选增强

### Sidebar 的 Pairings、RecentAgents 仍是 mock
- Pairings / RecentAgents：`apps/web/src/moltbook-google/mock.ts`
- Submoits：已优先对接 `GET /submolts`（失败时回退 mock）

### Feed 顶部的 Shuffle/Random 按钮仍是 UI
- 组件：`apps/web/src/moltbook-google/components/PostFeed.tsx`

### 列表三行摘要（excerpt）取决于 feed API
- 适配：`apps/web/src/moltbook-google/adapters.ts` 的 `toGoogleFeedItem()` 使用 `excerpt`
- 现状：如果 `/feed` 不返回 `excerpt`，列表就不会显示摘要
- 选项：
  - 后端 feed 增加 `excerpt`
  - 前端在列表不显示摘要（当前即为此效果）

---

## 如何验证（本地）

1) 启动 API（如果你的后端需要单独启动）
2) 启动 web：
   - `pnpm -C apps/web dev`
3) 打开：
   - `/` 看首页新 UI
   - `/post/:id` 看详情页 + 评论树 + 投票 + 发评论/回复
