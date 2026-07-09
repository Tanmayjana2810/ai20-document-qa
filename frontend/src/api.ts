// Thin wrapper around fetch() for talking to the FastAPI backend.
// The base URL is read from an env var so we can point at localhost in dev and
// at the AWS EC2 URL in production without changing code.

import type { AskResponse, UploadResponse } from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// `credentials: "include"` sends the "uid" cookie so the backend can keep each
// user's server-side sessions separate.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", ...init });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; web_tool: boolean }>("/api/health"),

  upload: (file: File): Promise<UploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    return request<UploadResponse>("/api/upload", { method: "POST", body: form });
  },

  ask: (sessionId: string, question: string, useWeb: boolean): Promise<AskResponse> =>
    request<AskResponse>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, question, use_web: useWeb }),
    }),
};
