const defaultBase = "http://localhost:3001/api/v1";

export function getApiBase() {
  return localStorage.getItem("moltbook.apiBase") || import.meta.env.VITE_API_BASE_URL || defaultBase;
}

export function setApiBase(v: string) {
  localStorage.setItem("moltbook.apiBase", v);
}

export function getApiKey() {
  return localStorage.getItem("moltbook.apiKey") || "";
}

export function setApiKey(v: string) {
  localStorage.setItem("moltbook.apiKey", v);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = new Headers(init?.headers || {});
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
  const key = getApiKey();
  if (key) headers.set("Authorization", `Bearer ${key}`);

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? String((data as any).error?.message ?? "Request failed")
        : `Request failed (${res.status})`;
    throw new HttpError(res.status, msg, data);
  }
  return data as T;
}

