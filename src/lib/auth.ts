export type RegisterInput = {
  email: string;
  username: string;
  name: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  _id: string;
  role: "USER" | "ADMIN" | string;
  accessToken: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const ENV_TOKEN = (import.meta.env.VITE_API_TOKEN as string | undefined) || "dev-token-123";

function buildURL(path: string): string {
  if (!API_BASE) return path;
  try {
    return new URL(path, API_BASE).toString();
  } catch {
    return path;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem("accessToken", token);
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem("accessToken");
  } catch {}
}

export function getToken(): string | null {
  try {
    const t = localStorage.getItem("accessToken");
    if (t) return t;
  } catch {}
  // Default to a dev token to avoid blocking demo flows
  return ENV_TOKEN || "dev-token-123";
}

async function safeFetch<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${res.statusText} ${text}`.trim());
  }
  return (await res.json()) as T;
}

export async function register(input: RegisterInput): Promise<{ ok: boolean }> {
  return safeFetch(buildURL("/auth/register"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const resp = await safeFetch<LoginResponse>(buildURL("/auth/login"), {
    method: "POST",
    body: JSON.stringify(input),
  });
  setToken(resp.accessToken);
  return resp;
}

export async function me(): Promise<any> {
  return safeFetch(buildURL("/users/me"), { method: "GET" });
}

export async function ping(): Promise<{ status: string }> {
  return safeFetch(buildURL("/ping"), { method: "GET" });
}