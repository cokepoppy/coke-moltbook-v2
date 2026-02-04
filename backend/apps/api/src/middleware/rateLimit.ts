import rateLimit from "express-rate-limit";
import type { Request } from "express";

function key(req: Request) {
  const prefix = req.apiKeyPrefix;
  if (prefix) return `k:${prefix}`;
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return `ip:${ip}`;
}

export const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: key
});

export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: key
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: key
});

