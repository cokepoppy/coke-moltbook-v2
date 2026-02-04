import { MoltbookClient } from "@moltbook/agent";

export async function createPost(args: {
  apiKey: string;
  apiBase?: string;
  submolt: string;
  title: string;
  content?: string;
  url?: string;
}) {
  const client = new MoltbookClient({ apiKey: args.apiKey, apiBase: args.apiBase });
  return client.createPost({ submolt: args.submolt, title: args.title, content: args.content, url: args.url });
}

