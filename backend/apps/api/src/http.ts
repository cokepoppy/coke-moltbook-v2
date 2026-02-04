import type { Response } from "express";

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "internal";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sendError(res: Response, err: ApiError, requestId?: string) {
  const body: Record<string, unknown> = {
    error: {
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {})
    }
  };
  if (requestId) body.request_id = requestId;
  res.status(err.status).json(body);
}

