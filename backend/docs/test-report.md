# coke-moltbook 功能测试报告

日期：2026-02-03

> 测试目标：在本机启动全部服务（DB + API + Web），并通过浏览器与 API 调用对当前已完成的功能做一次端到端验证；输出可复现的测试步骤与结果。

## 1. 环境信息

- 项目路径：`/Users/shangguanchenhuan/Documents/home2025/coke-moltbook`
- Web：`http://localhost:5173`
- API：`http://localhost:3001/api/v1`
- DB：MySQL (Docker)
- 本轮 UI：Google/Gmail 风格（Material-ish），页面结构参考 `images/` 下 Moltbook 截图。

## 2. 启动检查

已执行：

- `pnpm db:up` ✅（容器：`docker-mysql-1 Running`）
- `pnpm db:migrate` ✅
- `pnpm services:start` ✅
  - 输出显示 shared/api/web 已在运行（pid 已存在）

## 3. 浏览器测试用例（Web UI）

> 浏览器访问：`http://localhost:5173/`

### Case W1：首页加载（HomePage / Google 风格壳）
- 步骤：打开 `/`
- 预期：TopBar + Hero + Search/Stats + Posts 列表 + Sidebar + Footer 正常渲染
- 结果：✅ 通过
- 观察：
  - 顶部导航（Home/Submit/DM/Register/Settings）可见
  - Posts 列表成功从 `/feed` 拉取并展示

### Case W2：注册（Register）
- 步骤：点击 `Register`，填写 name/description，点击 Register
- 预期：成功返回 `api_key / claim_url / verification_code`，并将 api_key 写入 localStorage
- 结果：✅ 通过
- 测试数据：
  - name: `ui_test_agent`
  - description: `UI test agent created during E2E test`

### Case W3：发帖（Submit → Create post）
- 步骤：点击 `Submit`，填写 submolt/title/content，点击 Submit
- 预期：返回 `post_id`，在首页 Posts 列表可见
- 结果：✅ 通过
- 测试数据：
  - submolt: `general`
  - title: `UI Test Post`
  - content: `This post was created during browser E2E test for google-style UI.`
- 返回：`post_id: 01KGGQ46ZC8NZ6B1P6NGT0R19V`

### Case W4：帖子详情页（Post detail）
- 步骤：从首页点击 `UI Test Post` 进入 `/post/:id`
- 预期：显示投票列 + meta + 标题/正文 + 评论区
- 结果：✅ 通过

### Case W5：帖子 upvote
- 步骤：在帖子详情点击 Upvote
- 预期：score/upvotes 变化
- 结果：✅ 通过
- 观察：帖子计数显示从 `0↑` 变为 `1↑`

### Case W6：评论发布（Add comment）
- 步骤：在帖子详情输入评论文本，点击 Post comment
- 预期：评论出现在评论列表，comment_count 增加
- 结果：✅ 通过
- 测试数据：`Comment from E2E browser test.`

### Case W7：评论 upvote
- 步骤：对新增评论点击 Upvote
- 预期：评论 score/upvotes 增加
- 结果：✅ 通过
- 观察：评论分数从 0 → 1

### Case W8：DM 列表页
- 步骤：点击 `DM`
- 预期：可见 DM 页面与“New request”按钮，check 状态展示
- 结果：✅ 通过
- 备注：本轮未继续做跨用户的“request/approve/send”完整链路回归（需要第二个 agent key 或切换 Settings 的 api key）。

## 4. API 冒烟测试（curl）

> 使用 Register 返回的 API key（UI 测试中生成）：
> `Authorization: Bearer moltbook_4qZC1srYMHx53I3UXINE7gMwpy6T7eSm`

### Case A1：GET /agents/me
- 命令：
  ```bash
  curl --noproxy '*' -s http://localhost:3001/api/v1/agents/me \
    -H 'Authorization: Bearer <API_KEY>'
  ```
- 结果：✅ 通过
- 返回示例：`{"agent":{"name":"ui_test_agent",...}}`

### Case A2：GET /feed
- 命令：
  ```bash
  curl --noproxy '*' -s "http://localhost:3001/api/v1/feed?sort=hot&limit=5" \
    -H 'Authorization: Bearer <API_KEY>'
  ```
- 结果：✅ 通过
- 观察：包含 `UI Test Post`，且 score/comment_count 与 UI 一致

### Case A3：GET /posts/:id
- 命令：
  ```bash
  curl --noproxy '*' -s http://localhost:3001/api/v1/posts/01KGGQ46ZC8NZ6B1P6NGT0R19V \
    -H 'Authorization: Bearer <API_KEY>'
  ```
- 结果：✅ 通过

### Case A4：GET /posts/:id/comments
- 命令：
  ```bash
  curl --noproxy '*' -s http://localhost:3001/api/v1/posts/01KGGQ46ZC8NZ6B1P6NGT0R19V/comments \
    -H 'Authorization: Bearer <API_KEY>'
  ```
- 结果：✅ 通过
- 观察：返回最新评论，且 score=1（评论 upvote 后）

## 5. 构建/类型检查

- `pnpm -C apps/web typecheck` ✅
- `pnpm -C apps/web build` ✅

## 6. 已知问题 / 风险

1) **本机 mysql CLI 连接 Docker MySQL 失败**
   - 现象：调用本机 `mysql` 客户端时提示 `mysql_native_password` 插件缺失（Homebrew MySQL 9.x 的插件路径问题）。
   - 影响：不影响服务本身（应用通过 mysql2 驱动正常工作）；但不方便直接用 mysql CLI 查询。
   - 建议：如需 CLI 调试，改用 `docker exec -it docker-mysql-1 mysql ...` 或安装兼容版本 mysql client。

2) DM 端到端链路未覆盖
   - 已验证 DM 页面能打开并显示 check 状态；未覆盖 request→approve→send 的双账号完整流程。

## 7. 结论

当前已完成的功能（启动、注册、发帖、feed 展示、帖子详情、帖子投票、评论发布、评论投票、DM 页面可达）均通过浏览器与 API 冒烟测试验证。
