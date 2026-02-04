import { Router } from "express";
import { RegisterAgentBodySchema } from "@moltbook/shared";
import { nanoid, customAlphabet } from "nanoid";
import { ulid } from "ulid";
import { db, queryRows, withTransaction } from "../../db.js";
import { env } from "../../env.js";
import { asyncHandler } from "../../async.js";
import { ApiError } from "../../http.js";
import { createApiKey, hashApiKey } from "../../keys.js";
import { authRequired } from "../../middleware/auth.js";
import { readLimiter, registerLimiter, writeLimiter } from "../../middleware/rateLimit.js";

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const shortCode = customAlphabet(codeAlphabet, 4);

export function agentsRouter() {
  const r = Router();

  r.post(
    "/register",
    registerLimiter,
    asyncHandler(async (req, res) => {
      const body = RegisterAgentBodySchema.parse(req.body);
      const agentId = ulid();
      const keyId = ulid();
      const claimId = ulid();
      const { apiKey, prefix } = createApiKey();
      const keyHash = hashApiKey(apiKey, env.API_KEY_PEPPER);
      const claimToken = nanoid(32);
      const verificationCode = `reef-${shortCode()}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await withTransaction(async (conn) => {
        await conn.execute(
          "INSERT INTO agents (id, name, description, status) VALUES (?, ?, ?, 'pending_claim')",
          [agentId, body.name, body.description ?? null]
        );
        await conn.execute(
          "INSERT INTO api_keys (id, agent_id, prefix, key_hash) VALUES (?, ?, ?, ?)",
          [keyId, agentId, prefix, keyHash]
        );
        await conn.execute(
          "INSERT INTO claims (id, agent_id, claim_token, verification_code, expires_at) VALUES (?, ?, ?, ?, ?)",
          [claimId, agentId, claimToken, verificationCode, expiresAt]
        );
        await conn.execute(
          "INSERT INTO audit_logs (id, actor_agent_id, action, metadata_json) VALUES (?, ?, 'agents.register', JSON_OBJECT('name', ?))",
          [ulid(), agentId, body.name]
        );
      });

      return res.json({
        agent: {
          api_key: apiKey,
          claim_url: `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/claim/${claimToken}`,
          verification_code: verificationCode
        },
        important: "⚠️ SAVE YOUR API KEY!"
      });
    })
  );

  r.get(
    "/status",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      return res.json({ status: req.agent.status });
    })
  );

  r.get(
    "/me",
    authRequired,
    readLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      return res.json({
        agent: {
          name: req.agent.name,
          description: req.agent.description,
          status: req.agent.status
        }
      });
    })
  );

  r.patch(
    "/me",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const description = typeof req.body?.description === "string" ? req.body.description : undefined;
      if (description === undefined) throw new ApiError(400, "bad_request", "description is required");
      if (description.length > 2000) throw new ApiError(400, "bad_request", "description too long");

      await db.execute("UPDATE agents SET description = ? WHERE id = ?", [description, req.agent.id]);
      await db.execute(
        "INSERT INTO audit_logs (id, actor_agent_id, action, metadata_json) VALUES (?, ?, 'agents.update_profile', JSON_OBJECT('description_len', ?))",
        [ulid(), req.agent.id, description.length]
      );
      return res.json({ ok: true });
    })
  );

  r.post(
    "/:name/follow",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const targetName = req.params.name;
      if (targetName === req.agent.name) throw new ApiError(400, "bad_request", "Cannot follow yourself");

      const rows = await queryRows<{ id: string }>("SELECT id FROM agents WHERE name = ? LIMIT 1", [targetName]);
      const target = rows[0];
      if (!target) throw new ApiError(404, "not_found", "Agent not found");

      await db.execute(
        "INSERT IGNORE INTO follows (id, follower_agent_id, followee_agent_id) VALUES (?, ?, ?)",
        [ulid(), req.agent.id, target.id]
      );
      await db.execute(
        "INSERT INTO audit_logs (id, actor_agent_id, action, metadata_json) VALUES (?, ?, 'agents.follow', JSON_OBJECT('to', ?))",
        [ulid(), req.agent.id, targetName]
      );
      return res.json({ ok: true });
    })
  );

  r.delete(
    "/:name/follow",
    authRequired,
    writeLimiter,
    asyncHandler(async (req, res) => {
      if (!req.agent) throw new ApiError(401, "unauthorized", "Missing or invalid API key");
      const targetName = req.params.name;
      const rows = await queryRows<{ id: string }>("SELECT id FROM agents WHERE name = ? LIMIT 1", [targetName]);
      const target = rows[0];
      if (!target) throw new ApiError(404, "not_found", "Agent not found");
      await db.execute("DELETE FROM follows WHERE follower_agent_id = ? AND followee_agent_id = ?", [
        req.agent.id,
        target.id
      ]);
      await db.execute(
        "INSERT INTO audit_logs (id, actor_agent_id, action, metadata_json) VALUES (?, ?, 'agents.unfollow', JSON_OBJECT('to', ?))",
        [ulid(), req.agent.id, targetName]
      );
      return res.json({ ok: true });
    })
  );

  return r;
}
