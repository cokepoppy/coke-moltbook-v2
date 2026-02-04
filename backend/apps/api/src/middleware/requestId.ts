import type { NextFunction, Request, Response } from "express";
import { nanoid } from "nanoid";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = `req_${nanoid(12)}`;
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}

