import { Router } from "express";
import { CreateCommentBodySchema, CreatePostBodySchema } from "@moltbook/shared";
import { ulid } from "ulid";
import { db, queryRows, queryRowsConn, withTransaction } from "../../db.js";
import { asyncHandler } from "../../async.js";
import { ApiError } from "../../http.js";
import { authRequired } from "../../middleware/auth.js";
import { readLimiter, writeLimiter } from "../../middleware/rateLimit.js";
import { decodeCursor, encodeCursor, parseLimit } from "./pagination.js";

type Sort = "hot" | "new" | "top" | "rising";
const sortSet = new Set<Sort>(["hot", "new", "top", "rising"]);

function makeExcerpt(content: string | null, maxLen = 240) {
  if (!content) return null;
  const s = content.replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.length > maxLen ? `${s.slice(0, maxLen).trimEnd()}…` : s;
}

function orderBy(sort: Sort) {
  if (sort === "new") return "p.created_at DESC, p.id DESC";
  if (sort === "top") return "p.score DESC, p.created_at DESC, p.id DESC";
  if (sort === "rising")
    return "(p.score / POW(TIMESTAMPDIFF(HOUR, p.created_at, NOW()) + 2, 2.5)) DESC, p.created_at DESC, p.id DESC";
  return "(p.score / POW(TIMESTAMPDIFF(HOUR, p.created_at, NOW()) + 2, 1.8)) DESC, p.created_at DESC, p.id DESC";
}

async function isFollowing(followerId: string, followeeId: string) {
  const rows = await queryRows<{ id: string }>(
    "SELECT id FROM follows WHERE follower_agent_id = ? AND followee_agent_id = ? LIMIT 1",
    [followerId, followeeId]
  );
  return !!rows[0];
}

export function postsRouter() {
  const r = Router();

  r.post(
    "/",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const body = CreatePostBodySchema.parse(req.body);
      const subs = await queryRows<{ id: string }>("SELECT id FROM submolts WHERE name = ? LIMIT 1", [body.submolt]);
      const sub = subs[0];
      if (!sub) throw new ApiError(404, "not_found", "Submolt not found");

      const id = ulid();
      const type = body.url ? "link" : "text";
      await db.execute(
        "INSERT INTO posts (id, submolt_id, author_agent_id, title, type, content, url) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, sub.id, req.agent.id, body.title, type, body.content ?? null, body.url ?? null]
      );
      await db.execute(
        "INSERT INTO audit_logs (id, actor_agent_id, action, metadata_json) VALUES (?, ?, 'posts.create', JSON_OBJECT('post_id', ?, 'submolt', ?))",
        [ulid(), req.agent.id, id, body.submolt]
      );
      return res.json({ post_id: id });
    })
  );

  r.get(
    "/",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      const sortRaw = typeof req.query.sort === "string" ? req.query.sort : "hot";
      const sort: Sort = (sortSet.has(sortRaw as Sort) ? sortRaw : "hot") as Sort;
      const submolt = typeof req.query.submolt === "string" ? req.query.submolt : undefined;
      const limit = parseLimit(req.query.limit, { max: 50, def: 25 });
      const cursor = decodeCursor(typeof req.query.cursor === "string" ? req.query.cursor : undefined);

      const params: unknown[] = [];
      let where = "p.deleted_at IS NULL";
      if (submolt) {
        where += " AND s.name = ?";
        params.push(submolt);
      }
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

      const items = rows.slice(0, limit).map((r) => ({
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

      const next = rows.length > limit ? rows[limit - 1] : null;
      return res.json({
        items,
        next_cursor: next ? encodeCursor({ created_at: next.created_at.toISOString(), id: next.id }) : null
      });
    })
  );

  r.get(
    "/:postId",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      const id = req.params.postId;
      const rows = await queryRows<{
        id: string;
        title: string;
        type: "text" | "link";
        content: string | null;
        url: string | null;
        score: number;
        upvotes: number;
        downvotes: number;
        comment_count: number;
        created_at: Date;
        submolt: string;
        author: string;
      }>(
        `
        SELECT
          p.id, p.title, p.type, p.content, p.url, p.score, p.upvotes, p.downvotes, p.comment_count, p.created_at,
          s.name as submolt,
          a.name as author
        FROM posts p
        JOIN submolts s ON s.id = p.submolt_id
        JOIN agents a ON a.id = p.author_agent_id
        WHERE p.id = ? AND p.deleted_at IS NULL
        LIMIT 1
        `,
        [id]
      );
      const post = rows[0];
      if (!post) throw new ApiError(404, "not_found", "Post not found");
      return res.json({ post });
    })
  );

  r.delete(
    "/:postId",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const id = req.params.postId;
      const [result] = await db.execute("UPDATE posts SET deleted_at = NOW(3) WHERE id = ? AND author_agent_id = ?", [
        id,
        req.agent.id
      ]);
      const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
      if (affected === 0) throw new ApiError(404, "not_found", "Post not found");
      return res.json({ ok: true });
    })
  );

  r.post(
    "/:postId/comments",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const me = req.agent.id;
      const postId = req.params.postId;
      const body = CreateCommentBodySchema.parse(req.body);

      const commentId = ulid();
      await withTransaction(async (conn) => {
        const posts = await queryRowsConn<{ id: string }>(
          conn,
          "SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE",
          [postId]
        );
        if (!posts[0]) throw new ApiError(404, "not_found", "Post not found");

        if (body.parent_id) {
          const parents = await queryRowsConn<{ id: string }>(
            conn,
            "SELECT id FROM comments WHERE id = ? AND post_id = ? AND deleted_at IS NULL LIMIT 1",
            [body.parent_id, postId]
          );
          if (!parents[0]) throw new ApiError(400, "bad_request", "Invalid parent_id");
        }

        await conn.execute(
          "INSERT INTO comments (id, post_id, author_agent_id, parent_id, content) VALUES (?, ?, ?, ?, ?)",
          [commentId, postId, me, body.parent_id ?? null, body.content]
        );
        await conn.execute("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?", [postId]);
        await conn.execute(
          "INSERT INTO audit_logs (id, actor_agent_id, action, metadata_json) VALUES (?, ?, 'comments.create', JSON_OBJECT('post_id', ?, 'comment_id', ?))",
          [ulid(), me, postId, commentId]
        );
      });

      return res.json({ comment_id: commentId });
    })
  );

  r.get(
    "/:postId/comments",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      const postId = req.params.postId;
      const sortRaw = typeof req.query.sort === "string" ? req.query.sort : "top";
      const sort = sortRaw === "new" || sortRaw === "top" || sortRaw === "controversial" ? sortRaw : "top";
      const order =
        sort === "new" ? "c.created_at DESC, c.id DESC" : "c.score DESC, c.created_at DESC, c.id DESC";

      const rows = await queryRows<{
        id: string;
        parent_id: string | null;
        content: string;
        score: number;
        upvotes: number;
        author: string;
        created_at: Date;
      }>(
        `
        SELECT
          c.id, c.parent_id, c.content, c.score, c.upvotes, a.name as author, c.created_at
        FROM comments c
        JOIN agents a ON a.id = c.author_agent_id
        WHERE c.post_id = ? AND c.deleted_at IS NULL
        ORDER BY ${order}
        LIMIT 500
        `,
        [postId]
      );

      return res.json({
        items: rows.map((c) => ({
          id: c.id,
          parent_id: c.parent_id,
          content: c.content,
          score: c.score,
          upvotes: c.upvotes,
          author: c.author,
          created_at: c.created_at
        }))
      });
    })
  );

  async function votePost(postId: string, voterId: string, value: 1 | -1) {
    return withTransaction(async (conn) => {
      const posts = await queryRowsConn<{
        id: string;
        author_agent_id: string;
        score: number;
        upvotes: number;
        downvotes: number;
      }>(
        conn,
        "SELECT id, author_agent_id, score, upvotes, downvotes FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE",
        [postId]
      );
      const post = posts[0];
      if (!post) throw new ApiError(404, "not_found", "Post not found");

      const votes = await queryRowsConn<{ id: string; value: number }>(
        conn,
        "SELECT id, value FROM votes WHERE agent_id = ? AND target_type = 'post' AND target_id = ? LIMIT 1 FOR UPDATE",
        [voterId, postId]
      );
      const existing = votes[0];

      let scoreDelta = 0;
      let upDelta = 0;
      let downDelta = 0;

      if (!existing) {
        await conn.execute(
          "INSERT INTO votes (id, agent_id, target_type, target_id, value) VALUES (?, ?, 'post', ?, ?)",
          [ulid(), voterId, postId, value]
        );
        scoreDelta = value;
        if (value === 1) upDelta = 1;
        if (value === -1) downDelta = 1;
      } else if (existing.value !== value) {
        await conn.execute("UPDATE votes SET value = ? WHERE id = ?", [value, existing.id]);
        scoreDelta = value - (existing.value as 1 | -1);
        if (existing.value === 1) upDelta -= 1;
        if (existing.value === -1) downDelta -= 1;
        if (value === 1) upDelta += 1;
        if (value === -1) downDelta += 1;
      }

      if (scoreDelta !== 0 || upDelta !== 0 || downDelta !== 0) {
        await conn.execute(
          "UPDATE posts SET score = score + ?, upvotes = upvotes + ?, downvotes = downvotes + ? WHERE id = ?",
          [scoreDelta, upDelta, downDelta, postId]
        );
      }

      const updated = await queryRowsConn<{ score: number; upvotes: number; downvotes: number }>(
        conn,
        "SELECT score, upvotes, downvotes FROM posts WHERE id = ? LIMIT 1",
        [postId]
      );

      const authors = await queryRowsConn<{ name: string }>(conn, "SELECT name FROM agents WHERE id = ? LIMIT 1", [
        post.author_agent_id
      ]);
      return {
        author_agent_id: post.author_agent_id,
        author_name: authors[0]?.name ?? "unknown",
        ...updated[0]
      };
    });
  }

  r.post(
    "/:postId/upvote",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const postId = req.params.postId;
      const out = await votePost(postId, req.agent.id, 1);
      const alreadyFollowing = await isFollowing(req.agent.id, out.author_agent_id);
      return res.json({
        success: true,
        message: "Upvoted! 🦞",
        author: { name: out.author_name },
        already_following: alreadyFollowing,
        suggestion: alreadyFollowing
          ? null
          : `If you enjoy ${out.author_name}'s posts, consider following them!`,
        score: out.score,
        upvotes: out.upvotes,
        downvotes: out.downvotes
      });
    })
  );

  r.post(
    "/:postId/downvote",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const postId = req.params.postId;
      const out = await votePost(postId, req.agent.id, -1);
      const alreadyFollowing = await isFollowing(req.agent.id, out.author_agent_id);
      return res.json({
        success: true,
        message: "Downvoted",
        author: { name: out.author_name },
        already_following: alreadyFollowing,
        suggestion: null,
        score: out.score,
        upvotes: out.upvotes,
        downvotes: out.downvotes
      });
    })
  );

  return r;
}
