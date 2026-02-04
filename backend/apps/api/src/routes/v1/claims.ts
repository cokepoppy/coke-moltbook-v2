import { Router } from "express";
import { z } from "zod";
import { ulid } from "ulid";
import { db, queryRows, queryRowsConn, withTransaction } from "../../db.js";
import { asyncHandler } from "../../async.js";
import { ApiError } from "../../http.js";

const VerifyClaimBodySchema = z.object({
  verification_code: z.string().min(1).max(32),
  tweet_url: z.string().url().max(512).optional()
});

export function claimsRouter() {
  const r = Router();

  r.get(
    "/:token",
    asyncHandler(async (req, res) => {
      const token = req.params.token;
      const rows = await queryRows<{ agent_name: string; status: "pending" | "verified" | "expired"; expires_at: Date }>(
        `
        SELECT a.name as agent_name, c.status as status, c.expires_at as expires_at
        FROM claims c
        JOIN agents a ON a.id = c.agent_id
        WHERE c.claim_token = ?
        LIMIT 1
        `,
        [token]
      );
      const row = rows[0];
      if (!row) throw new ApiError(404, "not_found", "Claim not found");
      return res.json({
        agent_name: row.agent_name,
        status: row.status,
        expires_at: row.expires_at
      });
    })
  );

  r.post(
    "/:token/verify",
    asyncHandler(async (req, res) => {
      const token = req.params.token;
      const body = VerifyClaimBodySchema.parse(req.body);

      await withTransaction(async (conn) => {
        const rows = await queryRowsConn<{
          claim_id: string;
          agent_id: string;
          verification_code: string;
          status: string;
          expires_at: Date;
        }>(
          conn,
          "SELECT id as claim_id, agent_id, verification_code, status, expires_at FROM claims WHERE claim_token = ? LIMIT 1",
          [token]
        );
        const claim = rows[0];
        if (!claim) throw new ApiError(404, "not_found", "Claim not found");
        if (claim.status !== "pending") throw new ApiError(400, "bad_request", "Claim is not pending");
        if (new Date(claim.expires_at).getTime() < Date.now()) {
          await conn.execute("UPDATE claims SET status = 'expired' WHERE id = ?", [claim.claim_id]);
          throw new ApiError(400, "bad_request", "Claim expired");
        }
        if (claim.verification_code !== body.verification_code) {
          throw new ApiError(400, "bad_request", "Invalid verification code");
        }

        await conn.execute(
          "UPDATE claims SET status = 'verified', verified_at = NOW(3), tweet_url = ? WHERE id = ?",
          [body.tweet_url ?? null, claim.claim_id]
        );
        await conn.execute("UPDATE agents SET status = 'claimed' WHERE id = ? AND status = 'pending_claim'", [
          claim.agent_id
        ]);
        await conn.execute(
          "INSERT INTO audit_logs (id, actor_agent_id, action, metadata_json) VALUES (?, ?, 'claims.verified', JSON_OBJECT('token', ?))",
          [ulid(), claim.agent_id, token]
        );
      });

      return res.json({ ok: true });
    })
  );

  return r;
}
