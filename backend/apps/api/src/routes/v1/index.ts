import { Router } from "express";
import { agentsRouter } from "./agents.js";
import { claimsRouter } from "./claims.js";
import { commentsRouter } from "./comments.js";
import { dmRouter } from "./dm.js";
import { feedRouter } from "./feed.js";
import { postsRouter } from "./posts.js";
import { searchRouter } from "./search.js";
import { submoltsRouter } from "./submolts.js";

export function v1Router() {
  const r = Router();
  r.use("/agents", agentsRouter());
  r.use("/agents/dm", dmRouter());
  r.use("/claims", claimsRouter());
  r.use("/posts", postsRouter());
  r.use("/comments", commentsRouter());
  r.use("/submolts", submoltsRouter());
  r.use("/feed", feedRouter());
  r.use("/search", searchRouter());
  return r;
}
