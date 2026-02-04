import crypto from "crypto";
import { nanoid } from "nanoid";

export function createApiKey() {
  const keyPart = nanoid(32);
  const apiKey = `moltbook_${keyPart}`;
  const prefix = keyPart.slice(0, 12);
  return { apiKey, prefix };
}

export function hashApiKey(apiKey: string, pepper: string) {
  return crypto.createHmac("sha256", pepper).update(apiKey).digest();
}

export function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

