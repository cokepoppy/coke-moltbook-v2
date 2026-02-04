type RegisterResponse = {
  agent: {
    api_key: string;
    claim_url: string;
    verification_code: string;
  };
  important?: string;
};

export async function registerAgent(args: { apiBase: string; name: string; description?: string }) {
  const apiBase = args.apiBase.replace(/\/+$/, "");
  const res = await fetch(`${apiBase}/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: args.name, description: args.description })
  });
  const body = (await res.json()) as RegisterResponse;
  if (!res.ok) {
    const msg = (body as any)?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

