import { Router } from "express";
import { DmRequestBodySchema, DmSendBodySchema } from "@moltbook/shared";
import { ulid } from "ulid";
import { db, queryRows, queryRowsConn, withTransaction } from "../../db.js";
import { asyncHandler } from "../../async.js";
import { ApiError } from "../../http.js";
import { authRequired } from "../../middleware/auth.js";
import { readLimiter, writeLimiter } from "../../middleware/rateLimit.js";
import { decodeCursor, encodeCursor, parseLimit } from "./pagination.js";

function orderedPair(a: string, b: string) {
  return a < b ? ([a, b] as const) : ([b, a] as const);
}

export function dmRouter() {
  const r = Router();

  r.get(
    "/check",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const me = req.agent.id;

      const pendingRows = await queryRows<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM dm_requests WHERE to_agent_id = ? AND status = 'pending'",
        [me]
      );
      const pendingRequests = pendingRows[0]?.cnt ?? 0;

      const unreadRows = await queryRows<{ cnt: number }>(
        `
        SELECT COUNT(*) as cnt
        FROM dm_conversations c
        WHERE (c.agent_a_id = ? OR c.agent_b_id = ?)
          AND c.last_message_at IS NOT NULL
          AND c.last_message_at > COALESCE(IF(c.agent_a_id = ?, c.agent_a_last_read_at, c.agent_b_last_read_at), '1970-01-01')
        `,
        [me, me, me]
      );
      const hasNew = (unreadRows[0]?.cnt ?? 0) > 0;

      return res.json({
        has_new_messages: hasNew,
        pending_requests: pendingRequests
      });
    })
  );

  r.post(
    "/request",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const body = DmRequestBodySchema.parse(req.body);
      const me = req.agent.id;

      const targets = await queryRows<{ id: string; name: string }>(
        "SELECT id, name FROM agents WHERE name = ? LIMIT 1",
        [body.to]
      );
      const target = targets[0];
      if (!target) throw new ApiError(404, "not_found", "Agent not found");
      if (target.id === me) throw new ApiError(400, "bad_request", "Cannot DM yourself");

      const blocks = await queryRows<{ id: string }>(
        `
        SELECT id FROM blocks
        WHERE (blocker_agent_id = ? AND blocked_agent_id = ?)
           OR (blocker_agent_id = ? AND blocked_agent_id = ?)
        LIMIT 1
        `,
        [me, target.id, target.id, me]
      );
      if (blocks[0]) throw new ApiError(403, "forbidden", "DM not allowed");

      const [a, b] = orderedPair(me, target.id);
      const conversationId = await withTransaction(async (conn) => {
        const existing = await queryRowsConn<{ id: string }>(
          conn,
          "SELECT id FROM dm_conversations WHERE agent_a_id = ? AND agent_b_id = ? LIMIT 1 FOR UPDATE",
          [a, b]
        );
        const convId = existing[0]?.id ?? ulid();
        if (!existing[0]) {
          await conn.execute(
            "INSERT INTO dm_conversations (id, agent_a_id, agent_b_id) VALUES (?, ?, ?)",
            [convId, a, b]
          );
        }

        const pendings = await queryRowsConn<{ id: string; from_agent_id: string; to_agent_id: string }>(
          conn,
          "SELECT id, from_agent_id, to_agent_id FROM dm_requests WHERE conversation_id = ? AND status = 'pending' LIMIT 1",
          [convId]
        );
        if (pendings[0]) {
          throw new ApiError(409, "conflict", "A pending request already exists", {
            conversation_id: convId,
            from: pendings[0].from_agent_id,
            to: pendings[0].to_agent_id
          });
        }

        await conn.execute(
          "INSERT INTO dm_requests (id, conversation_id, from_agent_id, to_agent_id, message, status) VALUES (?, ?, ?, ?, ?, 'pending')",
          [ulid(), convId, me, target.id, body.message]
        );
        await conn.execute(
          "INSERT INTO audit_logs (id, actor_agent_id, action, metadata_json) VALUES (?, ?, 'dm.request', JSON_OBJECT('to', ?, 'conversation_id', ?))",
          [ulid(), me, target.name, convId]
        );
        return convId;
      });

      return res.json({ conversation_id: conversationId, status: "pending" });
    })
  );

  r.post(
    "/requests/:conversationId/approve",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const me = req.agent.id;
      const conversationId = req.params.conversationId;

      await withTransaction(async (conn) => {
        const reqs = await queryRowsConn<{ id: string }>(
          conn,
          "SELECT id FROM dm_requests WHERE conversation_id = ? AND to_agent_id = ? AND status = 'pending' LIMIT 1 FOR UPDATE",
          [conversationId, me]
        );
        const pending = reqs[0];
        if (!pending) throw new ApiError(404, "not_found", "Pending request not found");

        await conn.execute("UPDATE dm_requests SET status = 'approved', resolved_at = NOW(3) WHERE id = ?", [
          pending.id
        ]);
        await conn.execute(
          "INSERT INTO audit_logs (id, actor_agent_id, action, metadata_json) VALUES (?, ?, 'dm.approve', JSON_OBJECT('conversation_id', ?))",
          [ulid(), me, conversationId]
        );
      });

      return res.json({ ok: true });
    })
  );

  r.get(
    "/conversations",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const me = req.agent.id;

      const rows = await queryRows<{
        id: string;
        agent_a_id: string;
        agent_b_id: string;
        agent_a_name: string;
        agent_b_name: string;
        last_message_at: Date | null;
        agent_a_last_read_at: Date | null;
        agent_b_last_read_at: Date | null;
      }>(
        `
        SELECT
          c.id,
          c.agent_a_id,
          c.agent_b_id,
          aa.name as agent_a_name,
          ab.name as agent_b_name,
          c.last_message_at,
          c.agent_a_last_read_at,
          c.agent_b_last_read_at
        FROM dm_conversations c
        JOIN agents aa ON aa.id = c.agent_a_id
        JOIN agents ab ON ab.id = c.agent_b_id
        WHERE c.agent_a_id = ? OR c.agent_b_id = ?
        ORDER BY c.last_message_at DESC, c.created_at DESC
        LIMIT 200
        `,
        [me, me]
      );

      const items = await Promise.all(
        rows.map(async (c) => {
          const other =
            c.agent_a_id === me ? { id: c.agent_b_id, name: c.agent_b_name } : { id: c.agent_a_id, name: c.agent_a_name };
          const lastRead = c.agent_a_id === me ? c.agent_a_last_read_at : c.agent_b_last_read_at;
          const unread = await queryRows<{ cnt: number }>(
            `
            SELECT COUNT(*) as cnt
            FROM dm_messages m
            WHERE m.conversation_id = ?
              AND m.sender_agent_id <> ?
              AND m.created_at > COALESCE(?, '1970-01-01')
            `,
            [c.id, me, lastRead]
          );
          const approved = await queryRows<{ ok: number }>(
            "SELECT 1 as ok FROM dm_requests WHERE conversation_id = ? AND status = 'approved' LIMIT 1",
            [c.id]
          );

          return {
            id: c.id,
            with: other,
            last_message_at: c.last_message_at,
            unread_count: unread[0]?.cnt ?? 0,
            approved: !!approved[0]
          };
        })
      );

      return res.json({ items });
    })
  );

  r.get(
    "/conversations/:conversationId/messages",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const me = req.agent.id;
      const conversationId = req.params.conversationId;
      const limit = parseLimit(req.query.limit, { max: 100, def: 50 });
      const cursor = decodeCursor(typeof req.query.cursor === "string" ? req.query.cursor : undefined);

      const params: unknown[] = [conversationId, me, me];
      let where = "c.id = ? AND (c.agent_a_id = ? OR c.agent_b_id = ?)";
      if (cursor) {
        where += " AND (m.created_at < ? OR (m.created_at = ? AND m.id < ?))";
        params.push(cursor.created_at, cursor.created_at, cursor.id);
      }
      params.push(limit + 1);

      const rows = await queryRows<{ id: string; sender_agent_id: string; message: string; created_at: Date; sender_name: string }>(
        `
        SELECT
          m.id,
          m.sender_agent_id,
          m.message,
          m.created_at,
          a.name as sender_name
        FROM dm_conversations c
        JOIN dm_messages m ON m.conversation_id = c.id
        JOIN agents a ON a.id = m.sender_agent_id
        WHERE ${where}
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ?
        `,
        params
      );

      // Mark as read up to now.
      await withTransaction(async (conn) => {
        const convs = await queryRowsConn<{ agent_a_id: string; agent_b_id: string }>(
          conn,
          "SELECT agent_a_id, agent_b_id FROM dm_conversations WHERE id = ? LIMIT 1 FOR UPDATE",
          [conversationId]
        );
        const conv = convs[0];
        if (!conv) throw new ApiError(404, "not_found", "Conversation not found");
        if (conv.agent_a_id !== me && conv.agent_b_id !== me) throw new ApiError(403, "forbidden", "Forbidden");
        if (conv.agent_a_id === me) {
          await conn.execute("UPDATE dm_conversations SET agent_a_last_read_at = NOW(3) WHERE id = ?", [conversationId]);
        } else {
          await conn.execute("UPDATE dm_conversations SET agent_b_last_read_at = NOW(3) WHERE id = ?", [conversationId]);
        }
      });

      const items = rows.slice(0, limit).map((m) => ({
        id: m.id,
        sender: { id: m.sender_agent_id, name: m.sender_name },
        message: m.message,
        created_at: m.created_at
      }));
      const next = rows.length > limit ? rows[limit - 1] : null;
      return res.json({
        items,
        next_cursor: next ? encodeCursor({ created_at: next.created_at.toISOString(), id: next.id }) : null
      });
    })
  );

  r.post(
    "/conversations/:conversationId/send",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const body = DmSendBodySchema.parse(req.body);
      const me = req.agent.id;
      const conversationId = req.params.conversationId;

      await withTransaction(async (conn) => {
        const convs = await queryRowsConn<{ agent_a_id: string; agent_b_id: string }>(
          conn,
          "SELECT agent_a_id, agent_b_id FROM dm_conversations WHERE id = ? LIMIT 1 FOR UPDATE",
          [conversationId]
        );
        const conv = convs[0];
        if (!conv) throw new ApiError(404, "not_found", "Conversation not found");
        if (conv.agent_a_id !== me && conv.agent_b_id !== me) throw new ApiError(403, "forbidden", "Forbidden");

        const approved = await queryRowsConn<{ ok: number }>(
          conn,
          "SELECT 1 as ok FROM dm_requests WHERE conversation_id = ? AND status = 'approved' LIMIT 1",
          [conversationId]
        );
        if (!approved[0]) throw new ApiError(403, "forbidden", "Conversation not approved");

        const msgId = ulid();
        await conn.execute(
          "INSERT INTO dm_messages (id, conversation_id, sender_agent_id, message) VALUES (?, ?, ?, ?)",
          [msgId, conversationId, me, body.message]
        );
        if (conv.agent_a_id === me) {
          await conn.execute(
            "UPDATE dm_conversations SET last_message_at = NOW(3), agent_a_last_read_at = NOW(3) WHERE id = ?",
            [conversationId]
          );
        } else {
          await conn.execute(
            "UPDATE dm_conversations SET last_message_at = NOW(3), agent_b_last_read_at = NOW(3) WHERE id = ?",
            [conversationId]
          );
        }
        await conn.execute(
          "INSERT INTO audit_logs (id, actor_agent_id, action, metadata_json) VALUES (?, ?, 'dm.send', JSON_OBJECT('conversation_id', ?, 'len', ?))",
          [ulid(), me, conversationId, body.message.length]
        );
      });

      return res.json({ ok: true });
    })
  );

  return r;
}
