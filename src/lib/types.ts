export type PainPointType = "rage-click" | "error" | "long-dwell" | "form-abandon";

export interface Event {
  id: string;
  userId: string;
  timestamp: string; // ISO string
  eventType: string;
  componentId?: string;
  data?: Record<string, unknown>;
  sessionId?: string;
}

export type Severity = "low" | "medium" | "high";

export interface DetectedPainPoint {
  type: PainPointType;
  count?: number;
  durationMs?: number;
  severity: Severity;
  firstSeen?: string; // ISO string
  lastSeen?: string; // ISO string
  componentId?: string;
  page?: string;
}

// Shared user-related types (moved from data/mockUsers, without `name`)
export type UserContract = {
  version: string;
  rules: Array<{ key: string; value: unknown }>;
  thresholds: { [k: string]: number };
};

export type PainPoint = {
  id: string;
  // Keep broad compatibility with backend variations
  type: "rage-click" | "error" | "long dwell" | string;
  timestamp: string; // ISO string
  page: string;
  component: string;
};

export type User = {
  id: string;
  username: string;
  email?: string;
  lastActive: string; // ISO string
  contractVersion: string;
  contract: UserContract;
  painPoints: PainPoint[];
};