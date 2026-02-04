import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { corsOrigins, env } from "./env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { hostCheck } from "./middleware/hostCheck.js";
import { requestId } from "./middleware/requestId.js";
import { logger } from "./logger.js";
import { v1Router } from "./routes/v1/index.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.requestId!,
      customProps: (req) => ({ requestId: req.requestId })
    })
  );

  app.use(hostCheck);
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error("CORS not allowed"));
      },
      credentials: false
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/v1", v1Router());

  app.use(errorHandler);
  return app;
}
