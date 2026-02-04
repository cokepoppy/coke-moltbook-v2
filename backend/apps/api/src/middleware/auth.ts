import type { NextFunction, Request, Response } from "express";
import { db, queryRows } from "../db.js";
import { env } from "../env.js";
import { ApiError } from "../http.js";
import { hashApiKey, timingSafeEqual } from "../keys.js";
import type { AuthAgent } from "../types.js";

type Row = {
  agent_id: string;
  agent_name: string;
  agent_status: "pending_claim" | "claimed" | "suspended";
  agent_description: string | null;
  key_hash: Buffer;
  revoked_at: Date | null;
};

export async function authRequired(req: Request, _res: Response, next: NextFunction) {
  const auth = req.header("authorization") || req.header("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return next(
      new ApiError(401, "unauthorized", "Missing or invalid API key", {
        hint: "Avoid redirects; redirects can strip Authorization headers."
      })
    );
  }
  const apiKey = auth.slice("Bearer ".length).trim();
  if (!apiKey.startsWith("moltbook_") || apiKey.length < "moltbook_".length + 16) {
    return next(new ApiError(401, "unauthorized", "Missing or invalid API key"));
  }
  const keyPart = apiKey.slice("moltbook_".length);
  const prefix = keyPart.slice(0, 12);
  req.apiKeyPrefix = prefix;

  try {
    const rows = await queryRows<Row>(
      `
      SELECT
        a.id as agent_id,
        a.name as agent_name,
        a.status as agent_status,
        a.description as agent_description,
        k.key_hash as key_hash,
        k.revoked_at as revoked_at
      FROM api_keys k
      JOIN agents a ON a.id = k.agent_id
      WHERE k.prefix = ?
      LIMIT 1
      `,
      [prefix]
    );
    const row = rows[0];
    if (!row || row.revoked_at) return next(new ApiError(401, "unauthorized", "Missing or invalid API key"));
    const expected = row.key_hash;
    const actual = hashApiKey(apiKey, env.API_KEY_PEPPER);
    if (!timingSafeEqual(expected, actual)) {
      return next(new ApiError(401, "unauthorized", "Missing or invalid API key"));
    }

    const agent: AuthAgent = {
      id: row.agent_id,
      name: row.agent_name,
      status: row.agent_status,
      description: row.agent_description
    };
    req.agent = agent;
    void db.execute("UPDATE api_keys SET last_used_at = NOW(3) WHERE prefix = ?", [prefix]);
    return next();
  } catch (err) {
    return next(err);
  }
}
