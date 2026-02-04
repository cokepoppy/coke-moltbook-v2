import { Router } from "express";
import { CreateSubmoltBodySchema } from "@moltbook/shared";
import { ulid } from "ulid";
import { db, queryRows } from "../../db.js";
import { asyncHandler } from "../../async.js";
import { ApiError } from "../../http.js";
import { authRequired } from "../../middleware/auth.js";
import { readLimiter, writeLimiter } from "../../middleware/rateLimit.js";
import { decodeCursor, encodeCursor, parseLimit } from "./pagination.js";

type Sort = "hot" | "new" | "top" | "rising";
const sortSet = new Set<Sort>(["hot", "new", "top", "rising"]);

function orderBy(sort: Sort) {
  if (sort === "new") return "p.created_at DESC, p.id DESC";
  if (sort === "top") return "p.score DESC, p.created_at DESC, p.id DESC";
  if (sort === "rising")
    return "(p.score / POW(TIMESTAMPDIFF(HOUR, p.created_at, NOW()) + 2, 2.5)) DESC, p.created_at DESC, p.id DESC";
  return "(p.score / POW(TIMESTAMPDIFF(HOUR, p.created_at, NOW()) + 2, 1.8)) DESC, p.created_at DESC, p.id DESC";
}

export function submoltsRouter() {
  const r = Router();

  r.post(
    "/",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const body = CreateSubmoltBodySchema.parse(req.body);
      await db.execute(
        "INSERT INTO submolts (id, name, display_name, description, created_by_agent_id) VALUES (?, ?, ?, ?, ?)",
        [ulid(), body.name, body.display_name ?? null, body.description ?? null, req.agent.id]
      );
      return res.json({ ok: true });
    })
  );

  r.get(
    "/",
    authRequired,
    readLimiter,
      asyncHandler(async (_req, res) => {
      const rows = await queryRows<{ name: string; display_name: string | null; description: string | null; created_at: Date }>(
        "SELECT name, display_name, description, created_at FROM submolts ORDER BY name ASC"
      );
      return res.json({ items: rows });
    })
  );

  r.get(
    "/:name",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      const name = req.params.name;
      const rows = await queryRows<{ id: string; name: string; display_name: string | null; description: string | null; created_at: Date }>(
        "SELECT id, name, display_name, description, created_at FROM submolts WHERE name = ? LIMIT 1",
        [name]
      );
      const sub = rows[0];
      if (!sub) throw new ApiError(404, "not_found", "Submolt not found");
      return res.json({ submolt: sub });
    })
  );

  r.post(
    "/:name/subscribe",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const name = req.params.name;
      const rows = await queryRows<{ id: string }>("SELECT id FROM submolts WHERE name = ? LIMIT 1", [name]);
      const sub = rows[0];
      if (!sub) throw new ApiError(404, "not_found", "Submolt not found");
      await db.execute(
        "INSERT IGNORE INTO submolt_subscriptions (id, submolt_id, agent_id) VALUES (?, ?, ?)",
        [ulid(), sub.id, req.agent.id]
      );
      return res.json({ ok: true });
    })
  );

  r.delete(
    "/:name/subscribe",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const name = req.params.name;
      const rows = await queryRows<{ id: string }>("SELECT id FROM submolts WHERE name = ? LIMIT 1", [name]);
      const sub = rows[0];
      if (!sub) throw new ApiError(404, "not_found", "Submolt not found");
      await db.execute("DELETE FROM submolt_subscriptions WHERE submolt_id = ? AND agent_id = ?", [
        sub.id,
        req.agent.id
      ]);
      return res.json({ ok: true });
    })
  );

  r.get(
    "/:name/feed",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      const name = req.params.name;
      const sortRaw = typeof req.query.sort === "string" ? req.query.sort : "hot";
      const sort: Sort = (sortSet.has(sortRaw as Sort) ? sortRaw : "hot") as Sort;
      const limit = parseLimit(req.query.limit, { max: 50, def: 25 });
      const cursor = decodeCursor(typeof req.query.cursor === "string" ? req.query.cursor : undefined);

      const rows = await queryRows<{ id: string }>("SELECT id FROM submolts WHERE name = ? LIMIT 1", [name]);
      const sub = rows[0];
      if (!sub) throw new ApiError(404, "not_found", "Submolt not found");

      const params: unknown[] = [sub.id];
      let where = "p.deleted_at IS NULL AND p.submolt_id = ?";
      if (cursor) {
        where += " AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))";
        params.push(cursor.created_at, cursor.created_at, cursor.id);
      }
      params.push(limit + 1);

      const posts = await queryRows<{
        id: string;
        title: string;
        type: "text" | "link";
        submolt: string;
        author: string;
        score: number;
        upvotes: number;
        downvotes: number;
        comment_count: number;
        created_at: Date;
      }>(
        `
        SELECT
          p.id,
          p.title,
          p.type,
          s.name as submolt,
          a.name as author,
          p.score,
          p.upvotes,
          p.downvotes,
          p.comment_count,
          p.created_at
        FROM posts p
        JOIN submolts s ON s.id = p.submolt_id
        JOIN agents a ON a.id = p.author_agent_id
        WHERE ${where}
        ORDER BY ${orderBy(sort)}
        LIMIT ?
        `,
        params
      );

      const items = posts.slice(0, limit).map((p) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        submolt: p.submolt,
        author: p.author,
        score: p.score,
        upvotes: p.upvotes,
        downvotes: p.downvotes,
        comment_count: p.comment_count,
        created_at: p.created_at
      }));
      const next = posts.length > limit ? posts[limit - 1] : null;
      return res.json({
        items,
        next_cursor: next ? encodeCursor({ created_at: next.created_at.toISOString(), id: next.id }) : null
      });
    })
  );

  return r;
}
