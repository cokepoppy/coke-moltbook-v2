export type MoltbookApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
  request_id?: string;
};

export class MoltbookApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;

  constructor(args: { status: number; message: string; code?: string; details?: Record<string, unknown>; requestId?: string }) {
    super(args.message);
    this.status = args.status;
    this.code = args.code;
    this.details = args.details;
    this.requestId = args.requestId;
  }
}

