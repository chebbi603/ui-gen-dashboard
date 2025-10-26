import type { UserContract, PainPoint } from "@/data/mockUsers";

export type GenerateContractInput = {
  userId: string;
  currentContract: UserContract;
  painPoints: PainPoint[];
  analytics?: Record<string, unknown>;
};

export type GenerateContractResponse = {
  contract: UserContract;
};

async function safeFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function generateContractLLM(
  payload: GenerateContractInput
): Promise<GenerateContractResponse> {
  // Placeholder: Try real endpoint first; fallback to local tweak
  try {
    return await safeFetch<GenerateContractResponse>("/api/llm/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Fallback: bump version and tweak thresholds
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
}

export async function updateUserContract(
  userId: string,
  next: UserContract
): Promise<{ success: boolean }> {
  try {
    return await safeFetch<{ success: boolean }>(`/api/users/${userId}/contract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract: next }),
    });
  } catch {
    // optimistic success for MVP
    return { success: true };
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