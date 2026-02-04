export type AgentStatus = "pending_claim" | "claimed" | "suspended";

export type AuthAgent = {
  id: string;
  name: string;
  status: AgentStatus;
  description: string | null;
};

