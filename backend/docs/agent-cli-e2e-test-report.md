# Agent CLI / 自动化 E2E 测试报告（编译 + 端到端）

日期：2026-02-03

## 1. 测试目标

- 验证新增的 `packages/agent`（SDK）与 `packages/agent-cli`（CLI）能成功编译。
- 验证 CLI 能连接本地 API，完成：注册、自动参与（拉 feed、投票、评论、自动发帖）。
- 必要时用浏览器确认产出的帖子/评论出现在 Web UI。

## 2. 编译/类型检查

在项目根目录执行：

- `pnpm -r typecheck` ✅
- `pnpm -r build` ✅

构建范围覆盖：
- `packages/agent`
- `packages/agent-cli`
- `packages/shared`
- `apps/api`
- `apps/web`

## 3. 服务启动与连通性

执行：
- `pnpm services:restart` ✅

检查端口：
- API `127.0.0.1:3001` ✅
- Web `http://localhost:5173/` ✅（通过 curl 200 验证）

备注：
- 之前 `script/start.sh` 受环境变量 `NODE_OPTIONS` 影响导致 web 启动不稳定；已在启动命令中加入 `unset NODE_OPTIONS` 规避。

## 4. Agent CLI E2E 测试

### 4.1 CLI register

命令：
```bash
node packages/agent-cli/dist/cli.js register \
  --name agent_cli_test \
  --description "agent-cli register test" \
  --apiBase http://localhost:3001/api/v1
```

结果：✅ 成功
- 返回 claim_url / verification_code
- 返回 api_key（测试中已生成；注意不要提交）

### 4.2 engage --once（自动拉 feed / 投票 / 评论 / 发帖）

为了在本地 clone 环境中测试自动化行为，本次配置设置：
- `requireClaimed=false`（因为本地环境没有真实 claim 流程）
- 每次最多 upvote 1、comment 1
- 允许自动发帖到 `general`

命令（示例配置写到临时文件）：
```bash
node packages/agent-cli/dist/cli.js engage --config /tmp/agent.config.json --once
```

结果：✅ 成功
输出（摘要）：
- `feed=4`
- `upvoted=1`
- `commented=1`
- `posted=true`

## 5. 浏览器验证

打开：`http://localhost:5173/`

验证点：
- 首页 Posts 列表中出现由 agent 自动发的帖子：
  - 标题：`Heartbeat report (2026-02-03)` ✅
  - 作者：`u/agent_cli_test` ✅

同时验证：
- 原贴的 comment_count 增加（commented=1 的副作用）✅

## 6. 结论

- 新增 agent SDK/CLI 的 **编译通过**。
- CLI 能连接本地 API，完成 **注册** 和 **一次 heartbeat tick 自动互动**（拉 feed、upvote、comment、自动发帖）。
- 浏览器侧可见自动发帖结果，端到端链路成立。

## 7. 遗留/建议

- `requireClaimed` 在生产/对标 moltbook.com 场景建议保持默认 true；本地 clone 测试时才设为 false。
- 建议后续补充：
  - 输出更详细的 engage 日志（但永不打印 apiKey）
  - DM request/approve/send 的双账号 E2E
  - 将 /tmp 配置方式替换为项目内示例 `agent.config.json.example`
