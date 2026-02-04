import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().int().positive().optional().default(3001),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().optional().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  API_KEY_PEPPER: z.string().min(16),

  PUBLIC_BASE_URL: z.string().url().optional().default("http://localhost:5173"),
  ALLOWED_HOSTS: z
    .string()
    .optional()
    .default("localhost:3001,127.0.0.1:3001"),
  ALLOW_ANY_HOST: z
    .preprocess((v) => {
      if (v === undefined) return false;
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
      return false;
    }, z.boolean())
    .optional()
    .default(false),
  CORS_ORIGINS: z.string().optional().default("http://localhost:5173")
});

export const env = EnvSchema.parse(process.env);

export const allowedHosts = env.ALLOWED_HOSTS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
