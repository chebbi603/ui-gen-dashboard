import type { UserContract, PainPoint, User } from "@/data/mockUsers";
import type { Event } from "@/lib/types";
import { getToken } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
export const WS_URL: string | undefined =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  (API_BASE ? API_BASE.replace(/^http/, "ws") : undefined);
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 8000);

// Removed local LLM generation; backend-only optimization via /gemini

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
  const isGemini = typeof input === "string" && input.includes("/gemini/");
  if (token && !isGemini) headers.set("Authorization", `Bearer ${token}`);
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

// Local LLM generation removed

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
    // Correct route: backend exposes GET /users/:id/tracking-events
    const payload = await safeFetch<unknown>(buildURL(`/users/${userId}/tracking-events`), {
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
      // Backend returns `component` in TrackingEventDto; also tolerate componentId/elementId
      const componentIdRaw = obj["componentId"] ?? obj["elementId"] ?? obj["component"];
      const componentId = typeof componentIdRaw === "string" ? componentIdRaw : undefined;
      const sessionIdRaw = obj["sessionId"];
      const sessionId = typeof sessionIdRaw === "string" ? sessionIdRaw : undefined;
      const dataRaw = obj["data"] ?? obj["payload"];
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

// Version bump utilities removed with local generation

export async function triggerContractOptimization(
  userId: string
): Promise<{ jobId: string }> {
  const res = await safeFetch<OptimizationResponse>(
    buildURL(`/gemini/generate-contract`),
    {
      method: "POST",
      body: JSON.stringify({ userId }),
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

// Analyze user events via backend Gemini endpoint
export type ImprovementSuggestion = {
  title: string;
  description: string;
  elementId?: string;
  page?: string;
  priority: "low" | "medium" | "high";
};

export async function analyzeUserEvents(
  userId: string
): Promise<{ painPoints: PainPoint[]; improvements: ImprovementSuggestion[] }> {
  const payload = await safeFetch<unknown>(buildURL(`/gemini/analyze-events`), {
    method: "POST",
    body: JSON.stringify({ id: userId }),
  });
  const src = (typeof payload === "object" && payload !== null)
    ? (payload as Record<string, unknown>)
    : {};
  const container = (typeof src.data === "object" && src.data !== null)
    ? (src.data as Record<string, unknown>)
    : src;
  const arr: unknown[] = Array.isArray(container?.painPoints)
    ? (container!.painPoints as unknown[])
    : Array.isArray((container as any)?.items)
    ? (((container as any).items) as unknown[])
    : [];
  const improvementsArr: unknown[] = Array.isArray((container as any)?.improvements)
    ? (((container as any).improvements) as unknown[])
    : [];
  const result: PainPoint[] = [];
  for (let i = 0; i < arr.length; i++) {
    const p = arr[i];
    const obj = (typeof p === "object" && p !== null) ? (p as Record<string, unknown>) : {};
    const typeRaw = obj["type"];
    const typeStr = typeof typeRaw === "string" ? typeRaw : "unknown";
    const normalizedType = typeStr.replace(/_/g, "-").replace(/long-dwell/i, "long dwell");
    const pageRaw = obj["page"];
    const page = typeof pageRaw === "string" ? pageRaw : "Unknown";
    const compRaw = obj["componentId"] ?? obj["component"];
    const component = typeof compRaw === "string" ? compRaw : "Unknown";
    const tsRaw = obj["lastSeen"] ?? obj["firstSeen"] ?? obj["timestamp"];
    const timestamp = typeof tsRaw === "string" ? tsRaw : new Date().toISOString();
    const id = `${userId}-${i}-${Date.now()}`;
    result.push({ id, type: normalizedType as PainPoint["type"], timestamp, page, component });
  }
  const improvements: ImprovementSuggestion[] = [];
  for (let i = 0; i < improvementsArr.length; i++) {
    const imp = improvementsArr[i];
    const obj = (typeof imp === "object" && imp !== null) ? (imp as Record<string, unknown>) : {};
    const title = typeof obj["title"] === "string" ? (obj["title"] as string) : "Untitled";
    const description = typeof obj["description"] === "string" ? (obj["description"] as string) : "";
    const page = typeof obj["page"] === "string" ? (obj["page"] as string) : undefined;
    const elementId = typeof obj["elementId"] === "string" ? (obj["elementId"] as string) : undefined;
    const prRaw = obj["priority"];
    const priority = prRaw === "high" || prRaw === "medium" || prRaw === "low" ? (prRaw as any) : "medium";
    improvements.push({ title, description, page, elementId, priority });
  }
  return { painPoints: result, improvements };
}