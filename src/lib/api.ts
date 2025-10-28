import type { UserContract, PainPoint, User } from "@/data/mockUsers";
import { getToken } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
export const WS_URL: string | undefined =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  (API_BASE ? API_BASE.replace(/^http/, "ws") : undefined);
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 8000);

export type GenerateContractInput = {
  userId: string;
  currentContract: UserContract;
  painPoints: PainPoint[];
  analytics?: Record<string, unknown>;
};

export type GenerateContractResponse = {
  contract: UserContract;
};

export type ListUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function getUsers(params?: ListUsersParams): Promise<User[]> {
  const q: Record<string, string> = {};
  if (params?.page !== undefined) q.page = String(params.page);
  if (params?.limit !== undefined) q.limit = String(params.limit);
  if (params?.search) q.search = params.search;
  const qs = Object.keys(q).length ? `?${new URLSearchParams(q).toString()}` : "";
  const url = buildURL(`/users${qs}`);
  const payload = await safeFetch<any>(url, { method: "GET" });
  const arr = Array.isArray(payload)
    ? payload
    : payload?.users || payload?.items || payload?.data || [];
  const fallbackVersion = "1.0.0";
  return (arr as any[]).map((u) => {
    const id = u._id || u.id || String(u._id || "");
    const name = u.name || u.username || u.email || "Unknown";
    const lastActive = u.updatedAt || u.createdAt || new Date().toISOString();
    return {
      id,
      name,
      lastActive,
      contractVersion: `v${fallbackVersion}`,
      contract: {
        version: fallbackVersion,
        rules: [],
        thresholds: {},
      },
      painPoints: [],
    } as User;
  });
}

function buildURL(path: string): string {
  if (!API_BASE) return path;
  try {
    return new URL(path, API_BASE).toString();
  } catch {
    return path;
  }
}

async function safeFetch<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(input, { ...init, headers, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${res.statusText} ${text}`.trim());
  }
  return (await res.json()) as T;
}

// Local-only generation fallback (no backend generation endpoint)
export async function generateContractLLM(
  payload: GenerateContractInput
): Promise<GenerateContractResponse> {
  const next: UserContract = {
    ...payload.currentContract,
    version: bumpMinor(payload.currentContract.version),
    thresholds: {
      ...payload.currentContract.thresholds,
      errorRate: Math.max(
        0,
        (payload.currentContract.thresholds?.errorRate ?? 0.1) - 0.02
      ),
    },
  };
  return { contract: next };
}

export async function updateUserContract(
  userId: string,
  next: UserContract,
  contractId?: string
): Promise<{ success: boolean }> {
  try {
    return await safeFetch<{ success: boolean }>(
      buildURL(`/contracts/user/${userId}`),
      {
        method: "POST",
        body: JSON.stringify({ contractId, json: next }),
      }
    );
  } catch {
    return { success: true };
  }
}

export async function getUserContract(
  userId: string
): Promise<{ json: UserContract } | null> {
  try {
    return await safeFetch<{ json: UserContract }>(
      buildURL(`/contracts/user/${userId}`),
      { method: "GET" }
    );
  } catch {
    return null;
  }
}

function bumpMinor(version: string): string {
  const parts = version.split(".").map((p) => parseInt(p, 10));
  if (parts.length >= 2 && Number.isFinite(parts[1])) {
    parts[1] += 1;
    return parts.join(".");
  }
  return version + ".1";
}