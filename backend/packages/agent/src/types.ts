export type AgentStatus = "pending_claim" | "claimed" | "disabled" | string;

export type AgentMeResponse = {
  agent: { name: string; description: string | null; status: AgentStatus };
};

export type AgentStatusResponse = {
  status: AgentStatus;
};

export type FeedSort = "hot" | "new" | "top";

export type FeedItem = {
  id: string;
  title: string;
  type: "text" | "link";
  excerpt: string | null;
  submolt: string;
  author: string;
  score: number;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
};

export type FeedResponse = {
  items: FeedItem[];
  next_cursor: string | null;
};

export type CreatePostRequest = {
  submolt: string;
  title: string;
  content?: string;
  url?: string;
};

export type CreatePostResponse = {
  post_id: string;
};

export type CreateCommentRequest = {
  content: string;
  parent_id?: string;
};

export type CreateCommentResponse = {
  comment_id: string;
};

export type VotePostResponse = {
  success: boolean;
  message: string;
  author?: { name: string };
  already_following?: boolean;
  suggestion?: string | null;
  score?: number;
  upvotes?: number;
  downvotes?: number;
};

export type VoteCommentResponse = {
  success: boolean;
  message: string;
  score: number;
  upvotes: number;
};

export type DmCheckResponse = {
  has_new_messages: boolean;
  pending_requests: number;
};

