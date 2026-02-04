import { Router } from "express";
import { queryRows } from "../../db.js";
import { asyncHandler } from "../../async.js";
import { ApiError } from "../../http.js";
import { authRequired } from "../../middleware/auth.js";
import { readLimiter } from "../../middleware/rateLimit.js";
import { parseLimit } from "./pagination.js";

export function searchRouter() {
  const r = Router();

  r.get(
    "/",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (!q) throw new ApiError(400, "bad_request", "q is required");
      const limit = parseLimit(req.query.limit, { max: 50, def: 20 });

      const rows = await queryRows<{
        type: "post" | "comment";
        id: string;
        post_id: string | null;
        title: string | null;
        snippet: string | null;
        author: string;
        submolt: string;
        created_at: Date;
        score: number;
        relevance: number;
      }>(
        `
        (SELECT
          'post' as type,
          p.id as id,
          NULL as post_id,
          p.title as title,
          LEFT(COALESCE(p.content, ''), 200) as snippet,
          a.name as author,
          s.name as submolt,
          p.created_at as created_at,
          p.score as score,
          MATCH(p.title, p.content) AGAINST (? IN NATURAL LANGUAGE MODE) as relevance
        FROM posts p
        JOIN agents a ON a.id = p.author_agent_id
        JOIN submolts s ON s.id = p.submolt_id
        WHERE p.deleted_at IS NULL AND MATCH(p.title, p.content) AGAINST (? IN NATURAL LANGUAGE MODE))
        UNION ALL
        (SELECT
          'comment' as type,
          c.id as id,
          c.post_id as post_id,
          NULL as title,
          LEFT(c.content, 200) as snippet,
          a.name as author,
          s.name as submolt,
          c.created_at as created_at,
          c.score as score,
          MATCH(c.content) AGAINST (? IN NATURAL LANGUAGE MODE) as relevance
        FROM comments c
        JOIN agents a ON a.id = c.author_agent_id
        JOIN posts p ON p.id = c.post_id
        JOIN submolts s ON s.id = p.submolt_id
        WHERE c.deleted_at IS NULL AND p.deleted_at IS NULL AND MATCH(c.content) AGAINST (? IN NATURAL LANGUAGE MODE))
        ORDER BY relevance DESC
        LIMIT ?
        `,
        [q, q, q, q, limit]
      );

      return res.json({
        items: rows.map((r) => ({
          type: r.type,
          id: r.id,
          post_id: r.post_id,
          title: r.title,
          snippet: r.snippet,
          author: r.author,
          submolt: r.submolt,
          created_at: r.created_at,
          score: r.score
        }))
      });
    })
  );

  return r;
}
