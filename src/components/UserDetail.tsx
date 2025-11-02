import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { IconUser, IconAlertTriangle, IconLoader2, IconCircleCheck } from "@tabler/icons-react";
import { getUserContract, getUserEvents, triggerContractOptimization, getOptimizationJobStatus } from "@/lib/api";
import type { UserContract, PainPoint } from "@/data/mockUsers";
import type { Event, DetectedPainPoint, PainPointType } from "@/lib/types";
import { detectPainPoints, filterEventsByRange } from "@/lib/pain-point-detector";

function highlightJson(jsonText: string) {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = escapeHtml(jsonText)
    // keys
    .replace(/("[^"]+":)/g, '<span class="text-blue-400">$1</span>')
    // strings
    .replace(/("[^\"]*")/g, '<span class="text-green-400">$1</span>')
    // numbers
    .replace(
      /\b(-?\d+(?:\.\d+)?)\b/g,
      '<span class="text-orange-400">$1</span>'
    )
    // booleans/null
    .replace(
      /\b(true|false|null)\b/g,
      '<span class="text-purple-400">$1</span>'
    );
  return html;
}

function extractVersion(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const obj = value as Record<string, unknown>;
  const v1 = obj["version"];
  if (typeof v1 === "string") return v1;
  const meta = obj["meta"];
  if (meta && typeof meta === "object") {
    const v2 = (meta as Record<string, unknown>)["version"];
    if (typeof v2 === "string") return v2;
  }
  return "";
}

type TimeRange = "all" | "24h" | "7d" | "30d";

//

export function UserDetail({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [contractJson, setContractJson] = useState<string>("");
  const [contractVersion, setContractVersion] = useState<string>("");
  const [contractLoading, setContractLoading] = useState<boolean>(false);
  const [contractError, setContractError] = useState<string | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<"all" | PainPointType>("all");
  const [timeFilter, setTimeFilter] = useState<TimeRange>("all");

  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationJobId, setOptimizationJobId] = useState<string | null>(null);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showInfoBanner, setShowInfoBanner] = useState<boolean>(false);
  const [pollErrorCount, setPollErrorCount] = useState<number>(0);
  const [showSuccessBanner, setShowSuccessBanner] = useState<boolean>(false);
  const [originalContractJson, setOriginalContractJson] = useState<string>("");
  const [originalContractVersion, setOriginalContractVersion] = useState<string>("");
  const [showContractJson, setShowContractJson] = useState<boolean>(true);
  const [showOriginalJson, setShowOriginalJson] = useState<boolean>(true);
  const [showOptimizedJson, setShowOptimizedJson] = useState<boolean>(true);
  const [optimizedContractJson, setOptimizedContractJson] = useState<string>("");
  const [optimizedContractVersion, setOptimizedContractVersion] = useState<string>("");
  const [optimizationExplanation, setOptimizationExplanation] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const loadContract = useCallback(async () => {
    if (!userId) return;
    setContractLoading(true);
    setContractError(null);
    try {
      const res = await getUserContract(userId);
      if (res?.json) {
        setContractJson(JSON.stringify(res.json, null, 2));
        const v = extractVersion(res.json);
        setContractVersion(v);
      } else {
        setContractJson("");
        setContractVersion("");
      }
    } catch (e) {
      setContractError("Failed to load contract.");
    } finally {
      setContractLoading(false);
    }
  }, [userId]);

  const loadEvents = useCallback(async () => {
    if (!userId) return;
    setEventsLoading(true);
    setEventsError(null);
    try {
      const res = await getUserEvents(userId);
      setEvents(res);
    } catch (e) {
      setEventsError("Failed to load events.");
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadContract();
    loadEvents();
  }, [userId, loadContract, loadEvents]);

  const filteredEvents = useMemo(() => filterEventsByRange(events, timeFilter), [events, timeFilter]);
  const detected: DetectedPainPoint[] = useMemo(() => {
    const all = detectPainPoints(filteredEvents);
    if (typeFilter === "all") return all;
    return all.filter((p) => p.type === typeFilter);
  }, [filteredEvents, typeFilter]);

  useEffect(() => {
    if (!isOptimizing) return;
    setElapsedSeconds(0);
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isOptimizing]);

  useEffect(() => {
    if (!open || !userId) return;
    try {
      const saved = localStorage.getItem(`optimizationJobId:${userId}`);
      if (saved && saved.trim() && !isOptimizing) {
        setOptimizationJobId(saved);
        setIsOptimizing(true);
        setShowInfoBanner(true);
        setPollErrorCount(0);
        setElapsedSeconds(0);
      }
    } catch {}
  }, [open, userId]);

  const canOptimize = useMemo(() => {
    return Boolean(userId) && !contractLoading && !eventsLoading && !isOptimizing && Boolean(contractJson);
  }, [userId, contractLoading, eventsLoading, isOptimizing, contractJson]);

  const disabledReason = useMemo(() => {
    if (!userId) return "No user selected";
    if (contractLoading) return "Contract is loading";
    if (eventsLoading) return "Events are loading";
    if (!contractJson) return "No contract available";
    if (isOptimizing) return "Optimization already in progress";
    return undefined;
  }, [userId, contractLoading, eventsLoading, isOptimizing, contractJson]);

  const toPainPoints = (list: DetectedPainPoint[]): PainPoint[] => {
    return list.map((p, i) => ({
      id: `${p.type}-${p.componentId || p.page || i}`,
      type: p.type === "long-dwell" ? ("long dwell" as PainPoint["type"]) : p.type,
      timestamp: p.lastSeen || p.firstSeen || new Date().toISOString(),
      page: p.page || "Unknown",
      component: p.componentId || "unknown",
    }));
  };

  const onOptimize = useCallback(async () => {
    if (!userId) {
      setOptimizationError("No user selected.");
      return;
    }
    if (!contractJson) {
      setOptimizationError("Contract JSON unavailable or invalid.");
      return;
    }
    let parsed: UserContract | null = null;
    try {
      parsed = JSON.parse(contractJson) as UserContract;
    } catch {
      setOptimizationError("Invalid contract JSON format.");
      return;
    }
    setOptimizationError(null);
    setIsOptimizing(true);
    setShowInfoBanner(true);
    setShowSuccessBanner(false);
    setPollErrorCount(0);
    setOptimizedContractJson("");
    setOptimizedContractVersion("");
    setOptimizationExplanation(null);
    setShowExplanation(false);
    setOriginalContractJson(contractJson);
    setOriginalContractVersion(contractVersion);
    try {
      const pp = toPainPoints(detected);
      const res = await triggerContractOptimization(userId, parsed, pp);
      setOptimizationJobId(res.jobId);
      try {
        localStorage.setItem(`optimizationJobId:${userId}`, res.jobId);
      } catch {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to start optimization.";
      setOptimizationError(msg);
      setIsOptimizing(false);
    }
  }, [userId, contractJson, detected, contractVersion]);

  useEffect(() => {
    if (!isOptimizing || !optimizationJobId || !optimizationJobId.trim() || !userId) return;
    let intervalId: number | undefined;
    let timeoutId: number | undefined;
    let localErrorCount = 0;

    const check = async () => {
      try {
        const status = await getOptimizationJobStatus(optimizationJobId);
        if (status.status === "active") {
          return;
        }
        if (status.status === "completed") {
          if (intervalId) clearInterval(intervalId);
          if (timeoutId) clearTimeout(timeoutId);
          setIsOptimizing(false);
          setShowInfoBanner(false);
          setOptimizationError(null);
          setShowSuccessBanner(true);

          let next: UserContract | null = status.result?.contract ?? null;
          try {
            const fresh = await getUserContract(userId);
            if (fresh?.json) next = fresh.json;
          } catch {}
          if (!next) {
            setOptimizationError("New contract not available in response. Please contact support.");
            return;
          }
          setOptimizedContractJson(JSON.stringify(next, null, 2));
          const v = extractVersion(next);
          setOptimizedContractVersion(v);
          setOptimizationExplanation(status.result?.explanation ?? null);
          try { localStorage.removeItem(`optimizationJobId:${userId}`); } catch {}
          return;
        }
        if (status.status === "failed") {
          if (intervalId) clearInterval(intervalId);
          if (timeoutId) clearTimeout(timeoutId);
          setIsOptimizing(false);
          const msg = status.error || "Optimization failed.";
          setOptimizationError(msg);
          try { localStorage.removeItem(`optimizationJobId:${userId}`); } catch {}
          return;
        }
      } catch (err: unknown) {
        localErrorCount += 1;
        setPollErrorCount(localErrorCount);
        if (localErrorCount >= 3) {
          const msg = err instanceof Error ? err.message : "Network error during polling.";
          setOptimizationError(msg);
        }
      }
    };

    intervalId = window.setInterval(check, 2000);
    void check();

    timeoutId = window.setTimeout(() => {
      if (intervalId) clearInterval(intervalId);
      setIsOptimizing(false);
      setOptimizationError(
        `Optimization timed out after 60 seconds. The job may still be processing. You can refresh the page to check status later or try again.`
      );
      setShowInfoBanner(true);
    }, 60000);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOptimizing, optimizationJobId, userId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <IconUser />
            <span>User Details</span>
          </SheetTitle>
          <SheetDescription>
            Contract (read-only) and UX pain points summary
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Configuration Contract</span>
                <div className="inline-flex items-center gap-2">
                  {contractLoading && (
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <IconLoader2 className="size-4 animate-spin" aria-hidden />
                      Loading contract…
                    </span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setShowContractJson((v) => !v)} aria-expanded={showContractJson} aria-controls="contract-json">
                    {showContractJson ? "Hide JSON" : "Show JSON"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contractError && (
                <div className="flex items-center justify-between rounded-md border border-destructive px-3 py-2 text-destructive">
                  <div className="flex items-center gap-2 text-sm">
                    <IconAlertTriangle className="size-4" aria-hidden />
                    <span>Failed to load contract.</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={loadContract} aria-label="Retry loading contract">Retry</Button>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Contract Version: {contractVersion || "—"}
              </div>
              {contractJson && showContractJson ? (
                <div id="contract-json" className="rounded-lg border bg-muted p-3 overflow-auto min-h-48" aria-label="Contract JSON">
                  <pre className="font-mono text-xs leading-relaxed">
                    <code
                      dangerouslySetInnerHTML={{
                        __html: highlightJson(contractJson),
                      }}
                    />
                  </pre>
                </div>
              ) : !contractJson ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">No contract assigned to this user yet.</div>
              ) : null}
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pain Points Summary</span>
                {eventsLoading && (
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <IconLoader2 className="size-4 animate-spin" aria-hidden />
                    Loading events…
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {eventsError && (
                <div className="flex items-center justify-between rounded-md border border-destructive px-3 py-2 text-destructive">
                  <div className="flex items-center gap-2 text-sm">
                    <IconAlertTriangle className="size-4" aria-hidden />
                    <span>Failed to load events.</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={loadEvents} aria-label="Retry loading events">Retry</Button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  aria-label="Filter by pain point type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as unknown as "all" | PainPointType)}
                  className="bg-background rounded-md border px-2 py-1.5 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="rage-click">Rage Clicks</option>
                  <option value="error">Errors</option>
                  <option value="long-dwell">Long Dwells</option>
                  <option value="form-abandon">Form Abandonments</option>
                </select>

                <label className="text-xs text-muted-foreground ml-2">Time Range</label>
                <select
                  aria-label="Filter by time range"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as TimeRange)}
                  className="bg-background rounded-md border px-2 py-1.5 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>

              {events.length === 0 && !eventsLoading && !eventsError && (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">No events available for analysis.</div>
              )}

              <ul className="space-y-2">
                {detected.map((p, idx) => (
                  <li key={`${p.type}-${p.componentId || p.page || idx}`} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {p.type === "rage-click" && "⚡ Rage Click"}
                        {p.type === "error" && "❗ Error"}
                        {p.type === "long-dwell" && "⏱️ Long Dwell"}
                        {p.type === "form-abandon" && "📝 Form Abandonment"}
                      </span>
                      <span className={`text-xs ${p.severity === "high" ? "text-red-600" : p.severity === "medium" ? "text-amber-600" : "text-muted-foreground"}`}>
                        {p.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.componentId ? `Component: ${p.componentId}` : p.page ? `Page: ${p.page}` : ""}
                    </div>
                    <div className="text-xs mt-1">
                      {typeof p.count === "number" && <span>Count: {p.count}</span>}
                      {typeof p.durationMs === "number" && <span>Duration: {Math.round(p.durationMs / 1000)}s</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.firstSeen && <span>First: {new Date(p.firstSeen).toLocaleString()}</span>}
                      {p.lastSeen && <span className="ml-2">Last: {new Date(p.lastSeen).toLocaleString()}</span>}
                    </div>
                  </li>
                ))}
                {detected.length === 0 && events.length > 0 && (
                  <li className="rounded-lg border p-3 text-xs text-muted-foreground">No pain points detected for this user in the selected time range.</li>
                )}
              </ul>

              {optimizationError && (
                <div className="flex items-center justify-between rounded-md border border-destructive px-3 py-2 text-destructive">
                  <div className="flex items-center gap-2 text-sm">
                    <IconAlertTriangle className="size-4" aria-hidden />
                    <span>Failed to start optimization: {optimizationError}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOptimize}
                    aria-label="Retry optimization"
                  >
                    Retry Optimization
                  </Button>
                </div>
              )}

              {showInfoBanner && isOptimizing && (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex flex-col">
                    <span>
                      Optimization in progress… Do not refresh the page.
                    </span>
                    <span className="text-muted-foreground">
                      {optimizationJobId ? `Job ID: ${optimizationJobId}` : "Starting…"}
                      {" "}• Elapsed time: {elapsedSeconds}s
                      {pollErrorCount > 0 && (
                        <span className="ml-2">• Poll errors: {pollErrorCount}</span>
                      )}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowInfoBanner(false)} aria-label="Dismiss optimization status">
                    Dismiss
                  </Button>
                </div>
              )}

              {showSuccessBanner && !isOptimizing && optimizedContractJson && (
                <div className="flex items-center justify-between rounded-md border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <div className="flex items-center gap-2">
                    <IconCircleCheck className="size-4" aria-hidden />
                    <span>Contract optimized successfully!</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Job ID: {optimizationJobId || "—"}</span>
                </div>
              )}

              <div className="flex items-center justify-end">
                <Button
                  onClick={onOptimize}
                  disabled={!canOptimize}
                  aria-label="Optimize Contract with AI"
                  title={disabledReason}
                >
                  {isOptimizing || contractLoading || eventsLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <IconLoader2 className="size-4 animate-spin" aria-hidden />
                      Optimizing…
                    </span>
                  ) : optimizationError ? (
                    <span>Retry Optimization</span>
                  ) : (
                    <span>Optimize Contract with AI</span>
                  )}
                </Button>
              </div>

              {optimizedContractJson && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Original Contract {originalContractVersion ? `(Version ${originalContractVersion})` : ""}</span>
                          <Button size="sm" variant="outline" onClick={() => setShowOriginalJson((v) => !v)} aria-expanded={showOriginalJson} aria-controls="original-contract-json">
                            {showOriginalJson ? "Hide JSON" : "Show JSON"}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {showOriginalJson && (
                          <div id="original-contract-json" className="rounded-lg border bg-muted p-3 overflow-auto min-h-48" aria-label="Original Contract JSON">
                            <pre className="font-mono text-xs leading-relaxed">
                              <code
                                dangerouslySetInnerHTML={{
                                  __html: highlightJson(originalContractJson || contractJson),
                                }}
                              />
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Optimized Contract {optimizedContractVersion ? `(Version ${optimizedContractVersion})` : ""}</span>
                          <Button size="sm" variant="outline" onClick={() => setShowOptimizedJson((v) => !v)} aria-expanded={showOptimizedJson} aria-controls="optimized-contract-json">
                            {showOptimizedJson ? "Hide JSON" : "Show JSON"}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {showOptimizedJson && (
                          <div id="optimized-contract-json" className="rounded-lg border bg-muted p-3 overflow-auto min-h-48" aria-label="Optimized Contract JSON">
                            <pre className="font-mono text-xs leading-relaxed">
                              <code
                                dangerouslySetInnerHTML={{
                                  __html: highlightJson(optimizedContractJson),
                                }}
                              />
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="flex items-center justify-between">
                      <CardTitle>Optimization Explanation</CardTitle>
                      <Button size="sm" variant="outline" onClick={() => setShowExplanation((v) => !v)} aria-expanded={showExplanation} aria-controls="optimization-explanation">
                        {showExplanation ? "Hide" : "Show"}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {optimizationExplanation ? (
                        <div id="optimization-explanation" className="prose prose-sm max-w-none whitespace-pre-wrap">
                          {optimizationExplanation}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">The LLM did not provide an explanation for this optimization.</div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex items-center justify-end gap-2">
                    <Button variant="default" disabled title="Not implemented in MVP">Accept Optimization</Button>
                    <Button variant="outline" onClick={onOptimize}>Reject & Try Again</Button>
                    <Button variant="secondary" disabled title="Diff view optional">View Diff</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
