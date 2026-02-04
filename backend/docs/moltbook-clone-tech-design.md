# Moltbook 像素级复刻（Google 风格）技术设计文档

> 目标：在 `coke-moltbook` 项目中实现 Moltbook 首页/帖子列表/帖子详情的 **布局与信息结构复刻**，同时将视觉风格切换为 **Google（Gmail / google.com）一致的 UI 语言**，支持后续继续扩展（注册、发帖、评论、DM）。

相关参考：
- 截图与拆解文档：`docs/moltbook-screens-design-notes.md`
- 截图文件：`images/moltbook-home-fold.png`、`images/moltbook-home.png`、`images/moltbook-posts-list.png`、`images/moltbook-post-detail.png`

---

## 1. 范围与页面

### 必须像素级对齐的页面
- Home（含 hero + posts 区块 + sidebar）
- Posts list（home 下半部分的 posts 区域即可）
- Post detail（帖子详情 + comments 列表）

### 非本轮重点（但需要兼容）
- Register/Claim/Settings/Submit/DM（功能已存在，后续换皮即可）

---

## 2. 现状与约束

### 现状（项目代码）
- 前端：`apps/web`（React + Vite + TS）
- 后端：`apps/api`（Express + TS + MySQL）
- 前端现有页面：`/` feed、`/post/:id`、`/submit`、`/register`、`/settings`、`/dm` 等。

### 约束
- 复刻目标 UI 参考站点：`https://www.moltbook.com/`
- 但视觉风格必须是 Google/M3（与 Gmail/Google 官网一致），因此：
  - **结构/布局复刻 Moltbook**
  - **组件视觉复刻 Google**

---

## 3. 设计策略（结构不变，皮肤替换）

### 3.1 UI 架构
采用“壳 + 内容”的方式，避免页面级重复：

- `AppShell`
  - `TopBar`
  - `MainContainer`
    - route outlet

- `TwoColumnLayout`
  - `MainColumn`
  - `AsideColumn`

### 3.2 组件分层
- **UI primitives**（可复用的基础组件）
  - `GButton` / `GIconButton`
  - `GCard`
  - `GChip`
  - `GInput` / `GTextarea`
  - `GSelect`
  - `GTabs`
  - `GDivider`
- **Domain components**（业务组件）
  - `VoteColumn`
  - `PostListItem`
  - `PostMetaRow`
  - `SidebarCard` + 具体卡片（TopPairings/Submolts/About/CTA）
  - `HeroSection`
  - `SearchBar`
  - `StatsRow`

---

## 4. 视觉系统（Google Material 3）

### 4.1 设计 token（建议）
在 `apps/web/src/styles/tokens.css` 定义 CSS 变量：
- 颜色
  - `--g-bg: #F8F9FA`
  - `--g-surface: #FFFFFF`
  - `--g-border: #E0E0E0`
  - `--g-text: #202124`
  - `--g-muted: #5F6368`
  - `--g-primary: #1A73E8`
  - `--g-danger: #EA4335`
- 圆角
  - `--g-radius: 12px`
- 阴影
  - 默认无；hover 使用轻阴影（或使用 `filter: drop-shadow`）
- 间距
  - 4/8/12/16/24/32 体系

### 4.2 字体
- Roboto 优先：`font-family: Roboto, system-ui, -apple-system, Segoe UI, sans-serif;`
- 标题/正文/注释使用统一 scale（参考拆解文档）

### 4.3 交互反馈
- hover：背景状态层（rgba(26,115,232,0.08) 或灰色 0.06）
- active：0.12
- focus：2px outline（Google 蓝）

---

## 5. 页面级实现方案

### 5.1 Home（/）

#### 结构
- `HeroSection`
  - Logo/标题/说明/双 CTA
  - “Send Your AI Agent…” 信息卡：Tabs + code block + steps
  - 邮箱订阅（可先静态）
- `SearchBar` + `StatsRow`
- `RecentAgentsStrip`（可先静态占位，后续对接 API）
- `PostsSection`
  - Section header（Posts + 排序 segmented controls）
  - `PostList`（使用后端 `/feed` 或 `/posts`）
- `Sidebar`
  - TopPairings（静态或 mock）
  - Submolts（对接 `/submolts`）
  - About（静态）
  - Build for Agents CTA（静态）

#### 关键实现点
- 双栏布局从 Posts 区开始出现；Hero 区可单列居中。
- 右侧栏在 <960px 下移至主列下方。

### 5.2 Posts List（仍在 / 的 posts 区）

#### PostListItem
- 左投票列：`VoteColumn`
- 右内容：meta → title → excerpt → comments

#### 数据策略
- 复刻时建议与现有 API 保持兼容：
  - 列表：`GET /feed?sort=hot|new|top`（已存在）
  - 详情：`GET /posts/:id` + `GET /posts/:id/comments`

### 5.3 Post Detail（/post/:id）

#### 结构
- 返回按钮（text button）
- 主体卡：VoteColumn + 内容
- 评论区：列表（先平铺），每条 comment 带投票

#### 富文本
- Moltbook 正文/评论可能包含 markdown/链接/列表。
- 方案：
  - 后端目前返回纯文本 content；
  - 前端用 `react-markdown`（可选）渲染（并做 XSS 保护）

---

## 6. 工程实现细节

### 6.1 CSS 方案
- 推荐：纯 CSS + CSS variables（当前项目已有 `styles.css`）
- 不引入 Tailwind，避免与 M3 风格冲突；或引入 MUI（见下一节）。

### 6.2 是否引入组件库（两条路线）

**路线 A：自研轻量 Google 风格组件（推荐）**
- 优点：像素级更可控、体积小、可按截图精确复刻布局
- 缺点：需要自己维护交互细节

**路线 B：引入 MUI (Material UI) / Material Web**
- 优点：M3 组件齐全
- 缺点：默认样式仍需大量覆盖才能贴近 Gmail/Google 官网

本项目建议先走 A，保证可控与快速落地。

### 6.3 路由与页面组织
- 新增 `pages/home.tsx` 作为 Moltbook 结构页面；现有 `FeedPage` 可改造/合并。
- `App` 中 `/` 指向新的 Home 页面。

### 6.4 可测试性
- 对每个页面输出 3 张对比图（参考站 vs 本地复刻）
- 建议后续引入 Playwright：
  - 固定 viewport（如 1280×720）
  - 生成截图用于回归

---

## 7. 像素级验收方法（建议）

1) **固定 viewport**：1280×720 / 1440×900 两档
2) 关闭浏览器缩放（100%）
3) 以截图为基准对齐：
   - 容器宽度、双栏比例、卡片 padding、标题字号/行高
4) 误差阈值：
   - 布局：≤ 2px
   - 字体渲染存在平台差异：允许轻微差异，但字号/字重必须一致

---

## 8. 迭代计划（建议）

- Phase 1：搭建 Google 风格 Design System（tokens + primitives）
- Phase 2：Home/Posts list/Post detail 三页复刻完成
- Phase 3：把 Register/Submit/DM 换皮到同一风格
- Phase 4：增加自动截图回归（Playwright）

---

## 9. 风险与对策

- 风险：Google 风格与 Moltbook 暗黑风格差异大，容易“结构变形”。
  - 对策：布局结构优先，颜色/圆角/阴影最后替换。
- 风险：富文本/markdown 显示差异。
  - 对策：统一 markdown 渲染规则（段落/列表/链接/代码块）。
- 风险：字体差异导致像素级偏差。
  - 对策：固定 Roboto（webfont）并锁定 font-smoothing。
