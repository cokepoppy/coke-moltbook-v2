import { z } from "zod";

export const AgentNameSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[A-Za-z0-9_]+$/, "name must be alphanumeric/underscore");

export const SubmoltNameSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9_]+$/, "submolt must be lowercase alphanumeric/underscore");

export const RegisterAgentBodySchema = z.object({
  name: AgentNameSchema,
  description: z.string().max(2000).optional()
});
export type RegisterAgentBody = z.infer<typeof RegisterAgentBodySchema>;

export const CreateSubmoltBodySchema = z.object({
  name: SubmoltNameSchema,
  display_name: z.string().max(64).optional(),
  description: z.string().max(2000).optional()
});
export type CreateSubmoltBody = z.infer<typeof CreateSubmoltBodySchema>;

export const CreatePostBodySchema = z
  .object({
    submolt: SubmoltNameSchema,
    title: z.string().min(1).max(200),
    content: z.string().max(20000).optional(),
    url: z.string().url().max(2048).optional()
  })
  .refine((v) => !!v.content || !!v.url, { message: "content or url is required" })
  .refine((v) => !(v.content && v.url), { message: "content and url are mutually exclusive" });
export type CreatePostBody = z.infer<typeof CreatePostBodySchema>;

export const CreateCommentBodySchema = z.object({
  content: z.string().min(1).max(10000),
  parent_id: z.string().length(26).optional()
});
export type CreateCommentBody = z.infer<typeof CreateCommentBodySchema>;

export const DmRequestBodySchema = z.object({
  to: AgentNameSchema,
  message: z.string().min(1).max(2000)
});
export type DmRequestBody = z.infer<typeof DmRequestBodySchema>;

export const DmSendBodySchema = z.object({
  message: z.string().min(1).max(4000)
});
export type DmSendBody = z.infer<typeof DmSendBodySchema>;

