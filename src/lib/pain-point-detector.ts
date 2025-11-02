import type { Event, DetectedPainPoint, Severity } from "@/lib/types";

function severityFromCount(count: number): Severity {
  if (count > 5) return "high";
  if (count >= 3) return "medium";
  return "low";
}

function withinTimeRange(ts: string, range: "all" | "24h" | "7d" | "30d"): boolean {
  if (range === "all") return true;
  const now = Date.now();
  const t = new Date(ts).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const ranges: Record<string, number> = { "24h": dayMs, "7d": 7 * dayMs, "30d": 30 * dayMs };
  return now - t <= (ranges[range] ?? Number.MAX_SAFE_INTEGER);
}

export function filterEventsByRange(events: Event[], range: "all" | "24h" | "7d" | "30d"): Event[] {
  return events.filter((e) => withinTimeRange(e.timestamp, range));
}

// Rage Clicks: same componentId appears 3+ times within 2s window
function detectRageClicks(events: Event[]): DetectedPainPoint[] {
  const byComponent: Record<string, Event[]> = {};
  for (const e of events) {
    if (!e.componentId) continue;
    const key = e.componentId;
    (byComponent[key] ||= []).push(e);
  }
  const points: DetectedPainPoint[] = [];
  for (const [componentId, list] of Object.entries(byComponent)) {
    const sorted = list.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    let startIdx = 0;
    for (let i = 0; i < sorted.length; i++) {
      const startTs = new Date(sorted[startIdx].timestamp).getTime();
      const ts = new Date(sorted[i].timestamp).getTime();
      const windowMs = ts - startTs;
      if (windowMs > 2000) {
        startIdx++;
      }
      const count = i - startIdx + 1;
      if (count >= 3) {
        points.push({
          type: "rage-click",
          componentId,
          count,
          severity: severityFromCount(count),
          firstSeen: sorted[startIdx].timestamp,
          lastSeen: sorted[i].timestamp,
        });
      }
    }
  }
  return points;
}

// Errors: count events where eventType === 'error'
function detectErrors(events: Event[]): DetectedPainPoint[] {
  const errorEvents = events.filter((e) => e.eventType === "error");
  const count = errorEvents.length;
  if (count === 0) return [];
  const firstSeen = errorEvents[0]?.timestamp;
  const lastSeen = errorEvents[errorEvents.length - 1]?.timestamp;
  return [{ type: "error", count, severity: severityFromCount(count), firstSeen, lastSeen }];
}

// Long Dwell: gaps > 30s between navigation events on the same page
function detectLongDwell(events: Event[]): DetectedPainPoint[] {
  const navs = events.filter((e) => e.eventType === "navigate");
  const points: DetectedPainPoint[] = [];
  const getPage = (e: Event): string | undefined => {
    const d = e.data as Record<string, unknown> | undefined;
    const page = typeof d?.page === "string" ? d.page : undefined;
    return page;
  };
  const byPage: Record<string, Event[]> = {};
  for (const e of navs) {
    const page = getPage(e);
    if (!page) continue;
    (byPage[page] ||= []).push(e);
  }
  for (const [page, list] of Object.entries(byPage)) {
    const sorted = list.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].timestamp).getTime();
      const curr = new Date(sorted[i].timestamp).getTime();
      const gap = curr - prev;
      if (gap > 30_000) {
        points.push({ type: "long-dwell", page, durationMs: gap, severity: gap > 120_000 ? "high" : gap > 60_000 ? "medium" : "low", firstSeen: sorted[i - 1].timestamp, lastSeen: sorted[i].timestamp });
      }
    }
  }
  return points;
}

// Form Abandonment: form_start without corresponding form_submit within 5 minutes
function detectFormAbandon(events: Event[]): DetectedPainPoint[] {
  const starts = events.filter((e) => e.eventType === "form_start");
  const submits = events.filter((e) => e.eventType === "form_submit");
  const submitsByComponent: Record<string, number[]> = {};
  for (const e of submits) {
    const key = e.componentId || "";
    (submitsByComponent[key] ||= []).push(new Date(e.timestamp).getTime());
  }
  const points: DetectedPainPoint[] = [];
  for (const s of starts) {
    const key = s.componentId || "";
    const sTs = new Date(s.timestamp).getTime();
    const candidates = submitsByComponent[key] || [];
    const submitted = candidates.some((t) => t >= sTs && t <= sTs + 5 * 60_000);
    if (!submitted) {
      points.push({ type: "form-abandon", componentId: key || undefined, count: 1, severity: "low", firstSeen: s.timestamp, lastSeen: s.timestamp });
    }
  }
  // Aggregate counts by componentId
  const aggregated: Record<string, { count: number; firstSeen: string; lastSeen: string }> = {};
  for (const p of points) {
    const key = p.componentId || "";
    const entry = aggregated[key] || { count: 0, firstSeen: p.firstSeen!, lastSeen: p.lastSeen! };
    entry.count += 1;
    entry.firstSeen = entry.firstSeen <= (p.firstSeen as string) ? entry.firstSeen : (p.firstSeen as string);
    entry.lastSeen = entry.lastSeen >= (p.lastSeen as string) ? entry.lastSeen : (p.lastSeen as string);
    aggregated[key] = entry;
  }
  return Object.entries(aggregated).map(([componentId, { count, firstSeen, lastSeen }]) => ({
    type: "form-abandon",
    componentId: componentId || undefined,
    count,
    severity: severityFromCount(count),
    firstSeen,
    lastSeen,
  }));
}

export function detectPainPoints(events: Event[]): DetectedPainPoint[] {
  const rage = detectRageClicks(events);
  const errors = detectErrors(events);
  const dwell = detectLongDwell(events);
  const abandon = detectFormAbandon(events);
  return [...rage, ...errors, ...dwell, ...abandon];
}