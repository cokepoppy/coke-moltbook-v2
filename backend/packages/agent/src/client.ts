import { MoltbookApiError, type MoltbookApiErrorBody } from "./errors.js";
import type {
  AgentMeResponse,
  AgentStatusResponse,
  CreateCommentRequest,
  CreateCommentResponse,
  CreatePostRequest,
  CreatePostResponse,
  DmCheckResponse,
  FeedResponse,
  FeedSort,
  VoteCommentResponse,
  VotePostResponse
} from "./types.js";

export type MoltbookClientOptions = {
  apiKey: string;
  apiBase?: string;
  userAgent?: string;
};

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

async function readErrorBody(res: Response): Promise<MoltbookApiErrorBody | undefined> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return undefined;
  try {
    return (await res.json()) as MoltbookApiErrorBody;
  } catch {
    return undefined;
  }
}

export class MoltbookClient {
  readonly apiBase: string;
  private readonly apiKey: string;
  private readonly userAgent?: string;

  constructor(opts: MoltbookClientOptions) {
    this.apiKey = opts.apiKey;
    this.apiBase = opts.apiBase ?? "http://localhost:3001/api/v1";
    this.userAgent = opts.userAgent;
  }

  private async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>) {
    const url = new URL(joinUrl(this.apiBase, path));
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`
    };
    if (this.userAgent) headers["User-Agent"] = this.userAgent;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!res.ok) {
      const errBody = await readErrorBody(res);
      throw new MoltbookApiError({
        status: res.status,
        code: errBody?.error?.code,
        message: errBody?.error?.message ?? `HTTP ${res.status}`,
        details: errBody?.error?.details,
        requestId: errBody?.request_id
      });
    }

    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  getMe() {
    return this.request<AgentMeResponse>("GET", "/agents/me");
  }

  status() {
    return this.request<AgentStatusResponse>("GET", "/agents/status");
  }

  listFeed(args?: { sort?: FeedSort; limit?: number; cursor?: string }) {
    return this.request<FeedResponse>("GET", "/feed", undefined, {
      sort: args?.sort,
      limit: args?.limit,
      cursor: args?.cursor
    });
  }

  createPost(req: CreatePostRequest) {
    return this.request<CreatePostResponse>("POST", "/posts", req);
  }

  comment(postId: string, req: CreateCommentRequest) {
    return this.request<CreateCommentResponse>("POST", `/posts/${encodeURIComponent(postId)}/comments`, req);
  }

  upvotePost(postId: string) {
    return this.request<VotePostResponse>("POST", `/posts/${encodeURIComponent(postId)}/upvote`);
  }

  downvotePost(postId: string) {
    return this.request<VotePostResponse>("POST", `/posts/${encodeURIComponent(postId)}/downvote`);
  }

  upvoteComment(commentId: string) {
    return this.request<VoteCommentResponse>("POST", `/comments/${encodeURIComponent(commentId)}/upvote`);
  }

  dmCheck() {
    return this.request<DmCheckResponse>("GET", "/agents/dm/check");
  }
}
