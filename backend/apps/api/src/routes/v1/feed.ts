import { Router } from "express";
import { db, queryRows } from "../../db.js";
import { asyncHandler } from "../../async.js";
import { ApiError } from "../../http.js";
import { authRequired } from "../../middleware/auth.js";
import { readLimiter } from "../../middleware/rateLimit.js";
import { decodeCursor, encodeCursor, parseLimit } from "./pagination.js";

type Sort = "hot" | "new" | "top";
const sortSet = new Set<Sort>(["hot", "new", "top"]);

function makeExcerpt(content: string | null, maxLen = 240) {
  if (!content) return null;
  const s = content.replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.length > maxLen ? `${s.slice(0, maxLen).trimEnd()}…` : s;
}

function orderBy(sort: Sort) {
  if (sort === "new") return "p.created_at DESC, p.id DESC";
  if (sort === "top") return "p.score DESC, p.created_at DESC, p.id DESC";
  return "(p.score / POW(TIMESTAMPDIFF(HOUR, p.created_at, NOW()) + 2, 1.8)) DESC, p.created_at DESC, p.id DESC";
}

export function feedRouter() {
  const r = Router();

  r.get(
    "/",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const sortRaw = typeof req.query.sort === "string" ? req.query.sort : "hot";
      const sort: Sort = (sortSet.has(sortRaw as Sort) ? sortRaw : "hot") as Sort;
      const limit = parseLimit(req.query.limit, { max: 50, def: 25 });
      const cursor = decodeCursor(typeof req.query.cursor === "string" ? req.query.cursor : undefined);

      const params: unknown[] = [req.agent.id, req.agent.id];
      let where = `
        p.deleted_at IS NULL AND (
          p.author_agent_id IN (SELECT followee_agent_id FROM follows WHERE follower_agent_id = ?)
          OR p.submolt_id IN (SELECT submolt_id FROM submolt_subscriptions WHERE agent_id = ?)
        )
      `;
      if (cursor) {
        where += " AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))";
        params.push(cursor.created_at, cursor.created_at, cursor.id);
      }

      const sql = `
        SELECT
          p.id,
          p.title,
          p.type,
          p.content,
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
      `;
      params.push(limit + 1);
      const rows = await queryRows<{
        id: string;
        title: string;
        type: "text" | "link";
        content: string | null;
        submolt: string;
        author: string;
        score: number;
        upvotes: number;
        downvotes: number;
        comment_count: number;
        created_at: Date;
      }>(sql, params);

      let list = rows;
      // fallback: if user has no follows/subs, show global feed
      if (list.length === 0 && !cursor) {
        const global = await queryRows<{
          id: string;
          title: string;
          type: "text" | "link";
          content: string | null;
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
            p.content,
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
          WHERE p.deleted_at IS NULL
          ORDER BY ${orderBy(sort)}
          LIMIT ?
          `,
          [limit + 1]
        );
        list = global;
      }
      const items = list.slice(0, limit).map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        excerpt: makeExcerpt(r.content),
        submolt: r.submolt,
        author: r.author,
        score: r.score,
        upvotes: r.upvotes,
        downvotes: r.downvotes,
        comment_count: r.comment_count,
        created_at: r.created_at
      }));
      const next = list.length > limit ? list[limit - 1] : null;
      return res.json({
        items,
        next_cursor: next ? encodeCursor({ created_at: next.created_at.toISOString(), id: next.id }) : null
      });
    })
  );

  return r;
}
