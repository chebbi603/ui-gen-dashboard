import type { UserContract, PainPoint, User } from "@/data/mockUsers";
import type { Event } from "@/lib/types";
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

export type OptimizationRequest = {
  userId: string;
  baseContract: UserContract;
  painPoints: PainPoint[];
  analytics?: Record<string, unknown>;
};

export type OptimizationResponse = {
  jobId: string;
};

export type JobStatusResponse = {
  status: "active" | "completed" | "failed";
  result?: {
    contract: UserContract;
    explanation?: string;
  };
  error?: string;
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
  const payload = await safeFetch<unknown>(url, { method: "GET" });
  const src = (typeof payload === "object" && payload !== null) ? (payload as Record<string, unknown>) : undefined;
  const arr: unknown[] = Array.isArray(payload)
    ? (payload as unknown[])
    : Array.isArray(src?.users)
    ? (src!.users as unknown[])
    : Array.isArray(src?.items)
    ? (src!.items as unknown[])
    : Array.isArray(src?.data)
    ? (src!.data as unknown[])
    : [];
  const fallbackVersion = "1.0.0";
  return arr.map((u) => {
    const obj = (typeof u === "object" && u !== null) ? (u as Record<string, unknown>) : {};
    const idRaw = obj["_id"] ?? obj["id"];
    const id = typeof idRaw === "string" ? idRaw : String(idRaw ?? "");
    const nameRaw = obj["name"] ?? obj["username"] ?? obj["email"];
    const name = typeof nameRaw === "string" ? nameRaw : "Unknown";
    const emailRaw = obj["email"] ?? obj["username"];
    const email = typeof emailRaw === "string"
      ? (obj["email"] ? (emailRaw as string) : `${emailRaw as string}@example.com`)
      : undefined;
    const lastActiveRaw = obj["updatedAt"] ?? obj["createdAt"];
    const lastActive = typeof lastActiveRaw === "string"
      ? lastActiveRaw
      : new Date().toISOString();
    return {
      id,
      name,
      email,
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

export async function getUserEvents(userId: string): Promise<Event[]> {
  try {
    const payload = await safeFetch<unknown>(buildURL(`/events/user/${userId}`), {
      method: "GET",
    });
    const src = (typeof payload === "object" && payload !== null) ? (payload as Record<string, unknown>) : undefined;
    const arr: unknown[] = Array.isArray(payload)
      ? (payload as unknown[])
      : Array.isArray(src?.events)
      ? (src!.events as unknown[])
      : Array.isArray(src?.items)
      ? (src!.items as unknown[])
      : Array.isArray(src?.data)
      ? (src!.data as unknown[])
      : [];
    const result: Event[] = [];
    for (const e of arr) {
      const obj = (typeof e === "object" && e !== null) ? (e as Record<string, unknown>) : {};
      const idRaw = obj["id"] ?? obj["_id"];
      const tsRaw = obj["timestamp"];
      const id = typeof idRaw === "string" ? idRaw : `${userId}-${tsRaw ?? Math.random()}`;
      const ts = typeof tsRaw === "string"
        ? tsRaw
        : typeof tsRaw === "number"
        ? new Date(tsRaw).toISOString()
        : new Date().toISOString();
      const eventTypeRaw = obj["eventType"] ?? obj["type"] ?? "unknown";
      const eventType = typeof eventTypeRaw === "string" ? eventTypeRaw : String(eventTypeRaw);
      const componentIdRaw = obj["componentId"] ?? obj["elementId"];
      const componentId = typeof componentIdRaw === "string" ? componentIdRaw : undefined;
      const sessionIdRaw = obj["sessionId"];
      const sessionId = typeof sessionIdRaw === "string" ? sessionIdRaw : undefined;
      const dataRaw = obj["data"];
      const data = (dataRaw && typeof dataRaw === "object") ? (dataRaw as Record<string, unknown>) : undefined;
      if (!id || !ts || !eventType) continue;
      result.push({ id, userId, timestamp: ts, eventType, componentId, sessionId, data });
    }
    return result;
  } catch {
    // Partial failure tolerance: return an empty list to keep UI usable
    return [];
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

export async function triggerContractOptimization(
  userId: string,
  _currentContract: UserContract,
  _painPoints: PainPoint[]
): Promise<{ jobId: string }> {
  const priority = Math.min(5, Math.max(1, _painPoints.length >= 5 ? 3 : 2));
  const res = await safeFetch<OptimizationResponse>(
    buildURL(`/gemini/generate-contract`),
    {
      method: "POST",
      body: JSON.stringify({ userId, priority }),
    }
  );
  return { jobId: res.jobId };
}

function normalizeJobStatusPayload(payload: unknown): JobStatusResponse {
  const src = (typeof payload === "object" && payload !== null) ? (payload as Record<string, unknown>) : {};
  const rawStatus = typeof src.status === "string" ? src.status : undefined;
  const status: JobStatusResponse["status"] = rawStatus === "completed" || rawStatus === "failed" ? rawStatus : "active";
  const container = (typeof src.result === "object" && src.result !== null)
    ? (src.result as Record<string, unknown>)
    : (typeof src.data === "object" && src.data !== null)
    ? (src.data as Record<string, unknown>)
    : undefined;
  const error = typeof src.error === "string" ? src.error : (typeof src.message === "string" ? src.message : undefined);
  let result: JobStatusResponse["result"] | undefined;
  const contractCandidate = (container && typeof container.contract === "object" && container.contract !== null)
    ? (container.contract as UserContract)
    : (typeof src.contract === "object" && src.contract !== null)
    ? (src.contract as UserContract)
    : undefined;
  const explanationCandidate = (container && typeof container.explanation === "string")
    ? (container.explanation as string)
    : (typeof src.explanation === "string" ? (src.explanation as string) : undefined);
  if (contractCandidate) {
    result = { contract: contractCandidate, explanation: explanationCandidate };
  }
  return { status, result, error };
}

export async function getOptimizationJobStatus(jobId: string): Promise<JobStatusResponse> {
  const trimmed = jobId.trim();
  if (!trimmed) {
    throw new Error("Invalid jobId: empty string");
  }
  const url = buildURL(`/gemini/jobs/${trimmed}`);
  const payload = await safeFetch<unknown>(url, { method: "GET" });
  return normalizeJobStatusPayload(payload);
}