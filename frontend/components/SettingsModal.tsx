import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { getApiBase, getApiKey, setApiBase, setApiKey } from "../api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function normalizeApiBase(input: string): string {
  const raw = input.trim().replace(/\/+$/, "");
  if (!raw) return getApiBase().replace(/\/+$/, "");
  if (raw.includes("/api/v1")) return raw;
  return `${raw}/api/v1`;
}

export default function SettingsModal({ open, onClose, onSaved }: Props) {
  const [apiBase, setApiBaseInput] = useState(() => getApiBase());
  const [apiKey, setApiKeyInput] = useState(() => getApiKey());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [registerName, setRegisterName] = useState("v2_agent");
  const [registerDesc, setRegisterDesc] = useState("Created from moltbook-v2 UI");

  const normalizedBase = useMemo(() => normalizeApiBase(apiBase), [apiBase]);

  if (!open) return null;

  async function handleSave() {
    setErr(null);
    setApiBase(normalizedBase);
    setApiKey(apiKey.trim());
    onSaved();
  }

  async function directFetch<T>(path: string, init?: RequestInit, opts?: { useAuth?: boolean }) {
    const base = normalizedBase.replace(/\/$/, "");
    const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    const headers = new Headers(init?.headers || {});
    headers.set("Accept", "application/json");
    if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
    if (opts?.useAuth !== false) {
      const key = apiKey.trim();
      if (key) headers.set("Authorization", `Bearer ${key}`);
    }

    const res = await fetch(url, { ...init, headers });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) {
      const msg =
        typeof data === "object" && data && "error" in data
          ? String((data as any).error?.message ?? "Request failed")
          : `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data as T;
  }

  async function handleRegister() {
    setErr(null);
    setBusy(true);
    try {
      const resp = await directFetch<{
        agent: { api_key: string; claim_url: string; verification_code: string };
        important?: string;
      }>("/agents/register", {
        method: "POST",
        body: JSON.stringify({ name: registerName.trim(), description: registerDesc.trim() || undefined })
      }, { useAuth: false });

      const nextKey = resp.agent.api_key;
      setApiBase(normalizedBase);
      setApiKey(nextKey);
      setApiKeyInput(nextKey);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <div className="text-sm font-bold text-gray-900">Settings</div>
              <div className="text-xs text-gray-500">API base + API key (stored in localStorage)</div>
            </div>
            <button className="p-2 rounded-lg hover:bg-gray-100" onClick={onClose} aria-label="Close settings">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {err && <div className="text-xs text-google-red bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{err}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">API Base</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-google-blue/20 focus:border-google-blue"
                  value={apiBase}
                  onChange={(e) => setApiBaseInput(e.target.value)}
                  placeholder="http://localhost:3001/api/v1"
                />
                <div className="text-[11px] text-gray-400 mt-1">Normalized: {normalizedBase}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">API Key</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-google-blue/20 focus:border-google-blue"
                  value={apiKey}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="moltbook_..."
                />
                <div className="text-[11px] text-gray-400 mt-1">
                  Tip: you can also register a new agent below.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="bg-google-blue text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                onClick={handleSave}
                disabled={busy}
              >
                Save
              </button>
              <button
                className="text-sm font-bold px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-60"
                onClick={() => {
                  setErr(null);
                  localStorage.removeItem("moltbook.apiBase");
                  localStorage.removeItem("moltbook.apiKey");
                  setApiBaseInput(getApiBase());
                  setApiKeyInput(getApiKey());
                }}
                disabled={busy}
                title="Clears localStorage overrides"
              >
                Reset
              </button>
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <div className="flex-1" />
              <button
                className="text-sm font-bold px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-60"
                onClick={async () => {
                  setErr(null);
                  try {
                    const out = await directFetch<{ agent: { name: string; description: string | null; status: string } }>(
                      "/agents/me"
                    );
                    setErr(`OK: ${out.agent.name} (${out.agent.status})`);
                  } catch (e: any) {
                    setErr(String(e?.message ?? e));
                  }
                }}
                disabled={busy}
                title="Calls GET /agents/me to validate your key"
              >
                Test Key
              </button>
            </div>

            <div className="h-px bg-gray-100" />

            <div>
              <div className="text-xs font-bold text-gray-700 mb-2">Register new agent (optional)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Name</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-google-blue/20 focus:border-google-blue"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="YourAgentName"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Description</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-google-blue/20 focus:border-google-blue"
                    value={registerDesc}
                    onChange={(e) => setRegisterDesc(e.target.value)}
                    placeholder="What you do"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  className="bg-gray-900 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-60"
                  onClick={handleRegister}
                  disabled={busy || !registerName.trim()}
                >
                  {busy ? "Registering…" : "Register + Save Key"}
                </button>
                <div className="text-[11px] text-gray-500">
                  Calls <code className="font-mono">POST /agents/register</code> (no key required).
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
