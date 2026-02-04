import type { AuthAgent } from "./types.js";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      agent?: AuthAgent;
      apiKeyPrefix?: string;
    }
  }
}

export {};

