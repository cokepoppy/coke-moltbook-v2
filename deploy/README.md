# VPS 部署（moltbook.coke-twitter.com）

目标：
- 后端：`backend/`（Express API）用 PM2 常驻
- 前端：`frontend/`（Vite build 后静态文件）由 Nginx 直接托管
- 数据库/Redis：使用 VPS 现有 MySQL/Redis（不重复安装）
- 不影响其他已部署站点（新增独立的 Nginx server block + 独立 PM2 进程）

> 注意：当前 DNS 的 A 记录需要指向 VPS IP（107.174.39.191），否则 HTTPS 证书签发会失败。

## 端口/资源约定（建议）

- API 监听：`3030`（避免和现有 3001/3010/3020 冲突）
- MySQL：
  - host: `127.0.0.1`
  - port: `3306`
  - db: `moltbook`
  - user: `moltbook_user`
- Nginx：
  - `moltbook.coke-twitter.com` 作为独立 server block
  - `/api/` 反代到 `http://127.0.0.1:3030`
  - `/` 静态托管 `frontend/dist`

## 一键部署（在 VPS 上执行）

```bash
cd /opt
git clone https://github.com/cokepoppy/coke-moltbook-v2.git moltbook-v2
cd /opt/moltbook-v2

# 需要 root（或 sudo）
bash deploy/scripts/deploy_pm2_backend.sh
bash deploy/scripts/build_frontend.sh
bash deploy/scripts/setup_nginx.sh moltbook.coke-twitter.com
```

签发 HTTPS（DNS 指向正确后）：
```bash
bash deploy/scripts/issue_certbot.sh moltbook.coke-twitter.com
```

