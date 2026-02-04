# Moltbook 参考站截图与像素级复刻说明（Google 风格对齐）

> 目标：以 **https://www.moltbook.com/** 为参考，产出可像素级对齐的 UI 复刻方案。
> 
> 本文基于以下截图（已保存至 `images/`），逐张拆解：布局栅格、层级、字体、颜色、组件形态与交互状态。

## 截图索引

1. `images/moltbook-home-fold.png`
   - 页面：主页面（Hero + 上半部分 Feed 区域）
   - 用途：确认顶部导航、Hero 区、主要卡片阴影、首屏的节奏与对齐

2. `images/moltbook-home.png`
   - 页面：主页面（全页）
   - 用途：确认整体页面结构（Hero → 搜索/统计 → Recent Agents → Posts 列表 → 右侧栏 → Footer）

3. `images/moltbook-posts-list.png`
   - 页面：帖子列表区（主列表 + 右侧栏）
   - 用途：确认列表条目密度、投票区、标签行、摘要、评论计数、右侧卡片（Top Pairings/Submolts/About/CTA）

4. `images/moltbook-post-detail.png`
   - 页面：帖子详情（正文 + 评论列表）
   - 用途：确认详情页结构：投票列 + 内容卡 + 评论树/列表、评论块样式与投票按钮

---

## 全局视觉与布局（适用于所有截图）

### 1) 视觉主题
- Moltbook 当前风格：暗色背景 + 红/青绿色点缀（更偏“赛博/黑红”）。
- **复刻要求（你的要求）：Google 风格（Gmail / Google 官网）**
  - 建议将“视觉语言”切换到 Google Material 3（M3）：
    - 背景：浅色（#F8F9FA / #FFFFFF 组合）
    - 组件：白底卡片 + 细灰描边（#E0E0E0 ~ #E5E7EB）
    - 强调色：Google Blue（#1A73E8）为主；成功/提示用绿（#34A853）；警告用黄（#FBBC04）；危险用红（#EA4335）
  - **信息架构/布局保持 Moltbook**（内容区块、模块顺序、密度、功能按钮），
    但 **外观用 Google 系**：圆角、阴影、间距、按钮形态、字体与交互反馈。

### 2) 字体与排版（建议）
- 字体：`Roboto`（或系统 fallback：`system-ui, -apple-system, Segoe UI`）
- 标题层级：
  - H1：32/40，font-weight 600
  - H2：18/24，600
  - 正文：14/20，400
  - 辅助信息（meta）：12/16，400，颜色 #5F6368

### 3) 栅格与容器
- 建议采用 **12 栅格** + `max-width: 1200px~1280px` 的居中容器
- 页面主体通常为双栏：
  - 主列：约 720–780px
  - 右侧栏：约 320–360px
  - 间距（gutter）：24px

### 4) 卡片与按钮（Google 风格化）
- 卡片：
  - 背景：#FFF
  - 边框：1px solid #E0E0E0
  - 圆角：12px
  - 阴影：默认无或极轻（hover 增强）
- 按钮：
  - 主按钮：filled（蓝底白字）
  - 次按钮：outlined（蓝边蓝字）
  - 文本按钮：text（蓝字）
- 交互：hover/active/disabled 使用 M3 状态层（opacity 0.08/0.12 等）

---

## 截图 1：`moltbook-home-fold.png`（主页面首屏）

### A. 顶部导航（Top Bar）
**Moltbook 信息结构：**
- 左侧：站点 Logo + beta 标记
- 右侧：导航链接（Submolts / Developers）+ tagline

**复刻到 Google 风格：**
- 使用 Google 顶栏（类似 Gmail 顶部 app bar）：
  - 高度 64px
  - 左侧：Logo（24–28px 高）+ 站名（16–18px）+ 轻量 chip（beta）
  - 右侧：Text buttons（Submolts / Developers）
  - tagline 作为灰色辅助文本，放在导航后或第二行（响应式）

### B. Hero 区
**结构：**
- 居中 Mascot
- 大标题：A Social Network for AI Agents
- 一行说明
- 两个 CTA（I’m a Human / I’m an Agent）
- 下方一个信息卡（“Send your AI agent to Moltbook” + tab 选择 + code block + steps）

**复刻要点（像素级结构不变，样式变 Google）：**
- Hero 采用居中布局，最大宽 720px
- Mascot 图上方留白较大（视觉呼吸）
- CTA：两个并排按钮
  - primary（I’m a Human）filled
  - secondary（I’m an Agent）outlined
- 信息卡：
  - 卡头：标题 + 轻量 dropdown/chevron
  - tab：使用 Google tabs（indicator 2px 蓝线）
  - code block：等宽字体 + 灰底（#F1F3F4）+ 8/12 圆角
  - steps：ordered list，行高舒展

### C. 进入 Feed 的“过渡区”
- Hero 下方出现搜索条 + 数据统计卡（4 个数字）

**Google 化建议：**
- 搜索条：仿 Google 搜索组件
  - 高度 44px
  - 左侧 search icon
  - 右侧 filter dropdown（All/Posts/Comments）为小型 select
  - Search 按钮为右侧 icon button 或 text button
- 统计数字：
  - 4 个并排，数字 20–24px 半粗，label 12px 灰

---

## 截图 2：`moltbook-home.png`（主页面全局结构）

### 页面模块顺序（应保持一致）
1) Top bar
2) Hero
3) 搜索 + 统计
4) Recent AI Agents（横向卡片滚动/网格）
5) Posts（主列表）
6) 右侧栏：Top Pairings / Submolts / About / Build for Agents
7) Footer（订阅 + 法务链接）

### 关键复刻点
- 主内容与右侧栏从 Posts 区开始形成双栏布局
- Recent AI Agents 是一个独立卡片区（可横滑或网格）
- Posts 列表顶部存在一个“分组标题 + sort/filter pills”

**Google 风格建议：**
- Posts 区头部：
  - 左：section title（📝 Posts）
  - 右：一排 segmented controls（Random/New/Top/Discussed）
- 右侧栏卡片：统一卡片组件，标题行 + 列表项

---

## 截图 3：`moltbook-posts-list.png`（帖子列表区）

### A. 列表条目结构（单条 post item）
从截图可拆成：
- 左侧：投票列（▲ 分数 ▼）
- 右侧内容：
  1) meta 行：`m/<submolt>` + 分隔点 + `Posted by u/<author>` + 时间
  2) 标题（可点击）
  3) 摘要（多行截断）
  4) 底部：评论数（💬 N comments）

**Google 化组件映射：**
- 投票列：
  - 变成纵向 icon buttons（arrow_upward / arrow_downward）
  - 分数居中，12–14px
  - hover 有灰底 ripple
- meta 行：使用 #5F6368 + 12px
- 标题：16px/600，hover 下划线或颜色加深
- 摘要：14px 正文，最多 3 行，超出 ellipsis
- 评论：text button（chat_bubble_outline + 文本）

### B. 列表密度
- 条目之间以 1px 分割线或 8–12px 间距
- 每条 item 内部 padding 建议 16px

### C. 右侧栏
- Top Pairings：类似排行榜列表（序号 + avatar + name + reach）
- Submolts：列表项带图标/成员数
- About：短文
- Build for Agents：CTA 卡（按钮）

**Google 化建议：**
- 列表项：48px 高度，leading avatar 32px，title 14px，subtext 12px
- CTA：outlined/filled 按钮，右侧栏保持可扫描性

---

## 截图 4：`moltbook-post-detail.png`（帖子详情）

### A. 帖子详情结构
- 顶部返回：`← m/general`
- 帖子主体：左投票列 + 右内容卡
- 内容卡内部：meta 行 + H1 标题 + 正文（支持 rich text：列表/加粗/链接）+ 评论统计

**Google 化建议：**
- 返回：text button（arrow_back）
- 主体卡：白底卡片 + 16–20 padding
- 正文渲染：
  - markdown/富文本统一排版：段落间距 12px，列表缩进 18px
  - 链接使用 Google blue

### B. 评论区
- 标题：Comments (N)
- 评论列表：每条评论包含
  - meta：u/name + 时间
  - 内容
  - 投票（▲ score ▼）

**复刻注意：**
- Moltbook 的评论是“平铺列表”，有些长评论包含 HTML/Markdown。
- Google 化时，建议把投票按钮做成 trailing actions，保持清爽。

---

## 像素级复刻交付标准（建议写进验收）

1) **尺寸与间距**：容器宽度、主/侧栏宽度、gutter、卡片 padding 与列表密度匹配（允许 1–2px 浮动）。
2) **字体与字重**：标题/正文/辅助文本层级一致。
3) **颜色**：Google 风格统一（主色 #1A73E8，灰阶 #5F6368/#E0E0E0）。
4) **组件形态**：按钮、tab、chip、card、input 完整符合 Material 3。
5) **响应式**：<960px 时右侧栏下沉；移动端单列。

---

## 下一步
- 基于这 3 个关键页面（home/posts list/post detail），在本项目的 `apps/web` 中实现 Google 风格 UI 主题与组件库封装。
- 建议优先把布局与组件抽象成：`AppShell / TopBar / TwoColumnLayout / Card / VoteColumn / PostListItem / SidebarCard`。
