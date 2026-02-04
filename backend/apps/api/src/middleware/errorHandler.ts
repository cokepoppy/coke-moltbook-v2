import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../logger.js";
import { ApiError, sendError } from "../http.js";

function isMysqlDuplicate(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId;

  if (err instanceof ApiError) {
    return sendError(res, err, requestId);
  }

  if (err instanceof ZodError) {
    return sendError(
      res,
      new ApiError(400, "bad_request", "Invalid request", {
        issues: err.issues
      }),
      requestId
    );
  }

  if (isMysqlDuplicate(err)) {
    return sendError(res, new ApiError(409, "conflict", "Already exists"), requestId);
  }

  logger.error({ err, requestId }, "unhandled error");
  return sendError(res, new ApiError(500, "internal", "Internal server error"), requestId);
}

