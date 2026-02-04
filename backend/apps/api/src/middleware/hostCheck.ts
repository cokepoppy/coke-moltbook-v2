import type { NextFunction, Request, Response } from "express";
import { allowedHosts, env } from "../env.js";
import { ApiError } from "../http.js";

export function hostCheck(req: Request, _res: Response, next: NextFunction) {
  if (env.ALLOW_ANY_HOST) return next();
  const host = req.headers.host;
  if (!host) return next(new ApiError(400, "bad_request", "Missing Host header"));
  if (!allowedHosts.includes(host)) {
    return next(
      new ApiError(421, "forbidden", "Misdirected request (invalid Host)", {
        allowed_hosts: allowedHosts
      })
    );
  }
  return next();
}

