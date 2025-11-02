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