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
import {
  IconUser,
  IconAlertTriangle,
  IconLoader2,
  IconCircleCheck,
} from "@tabler/icons-react";
import {
  getUserContract,
  getCanonicalContract,
  triggerContractOptimization,
  getOptimizationJobStatus,
} from "@/lib/api";
import { useEventAnalysis } from "@/hooks/useEventAnalysis";
import { formatDateTime } from "@/lib/utils";
import type { UserContract } from "@/lib/types";

function highlightJson(jsonText: string) {
  return highlightJsonSafe(jsonText);
}

// Safer highlighter that avoids corrupting inserted tag attributes
function highlightJsonSafe(jsonText: string) {
  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  const html = escapeHtml(jsonText);
  const withKeys = html.replace(
    /(&quot;[^&]*?&quot;)(\s*:\s*)/g,
    '<span class="text-violet-600">$1</span>$2'
  );
  const withStrings = withKeys.replace(
    /(:\s*)(&quot;.*?&quot;)/g,
    '$1<span class="text-teal-600">$2</span>'
  );
  const withNumbers = withStrings.replace(
    /(:\s*)(-?\d+(?:\.\d+)?)/g,
    '$1<span class="text-blue-600">$2</span>'
  );
  const withBooleans = withNumbers.replace(
    /(:\s*)(true|false)/g,
    '$1<span class="text-orange-600">$2</span>'
  );
  const withNull = withBooleans.replace(
    /(:\s*)(null)/g,
    '$1<span class="text-gray-500">$2</span>'
  );
  return withNull;
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

// Removed TimeRange type (pain points UI simplified)

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
  const [contractExplanation, setContractExplanation] = useState<string | null>(null);
  const [showContractExplanation, setShowContractExplanation] = useState<boolean>(false);

  // Analytics placeholder (no event/pain point detection in MVP)

  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationJobId, setOptimizationJobId] = useState<string | null>(
    null
  );
  const [optimizationError, setOptimizationError] = useState<string | null>(
    null
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showInfoBanner, setShowInfoBanner] = useState<boolean>(false);
  const [pollErrorCount, setPollErrorCount] = useState<number>(0);
  const [showSuccessBanner, setShowSuccessBanner] = useState<boolean>(false);
  const [originalContractJson, setOriginalContractJson] = useState<string>("");
  const [originalContractVersion, setOriginalContractVersion] =
    useState<string>("");
  const [showContractJson, setShowContractJson] = useState<boolean>(true);
  const [showOriginalJson, setShowOriginalJson] = useState<boolean>(true);
  const [showOptimizedJson, setShowOptimizedJson] = useState<boolean>(true);
  const [optimizedContractJson, setOptimizedContractJson] =
    useState<string>("");
  const [optimizedContractVersion, setOptimizedContractVersion] =
    useState<string>("");
  const [optimizationExplanation, setOptimizationExplanation] = useState<
    string | null
  >(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Event analysis hook
  const {
    painPoints,
    improvements,
    loading: analysisLoading,
    error: analysisError,
    analyzeEvents,
  } = useEventAnalysis();

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
        // Prefer top-level meta.optimizationExplanation; fall back to json.meta.optimizationExplanation
        const topMeta = (res.meta ?? {}) as Record<string, unknown>;
        const fromTop = typeof topMeta["optimizationExplanation"] === "string" ? (topMeta["optimizationExplanation"] as string) : null;
        const jsonMeta = (res.json as any)?.meta ?? {};
        const fromJson = typeof jsonMeta?.optimizationExplanation === "string" ? (jsonMeta.optimizationExplanation as string) : null;
        setContractExplanation(fromTop || fromJson || null);
      } else {
        setContractJson("");
        setContractVersion("");
        setContractExplanation(null);
      }
    } catch (e) {
      setContractError("Failed to load contract.");
    } finally {
      setContractLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadContract();
  }, [userId, loadContract]);

  // Pain point detection removed

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
    return Boolean(userId) && !contractLoading && !isOptimizing;
  }, [userId, contractLoading, isOptimizing]);

  const disabledReason = useMemo(() => {
    if (!userId) return "No user selected";
    if (contractLoading) return "Contract is loading";
    if (isOptimizing) return "Optimization already in progress";
    return undefined;
  }, [userId, contractLoading, isOptimizing]);

  // Pain points conversion removed

  const onOptimize = useCallback(async () => {
    if (!userId) {
      setOptimizationError("No user selected.");
      return;
    }
    // When no personalized contract exists, allow generation from canonical.
    // Skip local JSON parsing; backend uses userId only for optimization
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
      // Determine base contract: use personalized if available, otherwise fetch canonical
      let base: UserContract | null = null;
      if (contractJson && contractJson.trim()) {
        try {
          base = JSON.parse(contractJson) as UserContract;
        } catch {
          base = null;
        }
      }
      if (!base) {
        base = await getCanonicalContract();
      }
      if (!base) {
        setOptimizationError(
          "Canonical contract unavailable; cannot start optimization."
        );
        setIsOptimizing(false);
        setShowInfoBanner(false);
        return;
      }
      const res = await triggerContractOptimization(userId, base, Array.isArray(painPoints) ? painPoints : undefined);
      setOptimizationJobId(res.jobId);
      try {
        localStorage.setItem(`optimizationJobId:${userId}`, res.jobId);
      } catch {}
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to start optimization.";
      setOptimizationError(msg);
      setIsOptimizing(false);
    }
  }, [userId, contractJson, contractVersion]);

  const ctaLabel = useMemo(() => {
    if (isOptimizing || contractLoading) return "Optimizing…";
    if (optimizationError) return "Retry Optimization";
    return contractJson ? "Optimize Contract with AI" : "Generate Personalized Contract";
  }, [isOptimizing, contractLoading, optimizationError, contractJson]);

  useEffect(() => {
    if (
      !isOptimizing ||
      !optimizationJobId ||
      !optimizationJobId.trim() ||
      !userId
    )
      return;
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
          // Prefer backend-provided original snapshot as the baseline, if available
          const original = status.result?.originalSnapshot;
          if (original && typeof original === "object") {
            try {
              setOriginalContractJson(JSON.stringify(original, null, 2));
            } catch {}
            const ov = extractVersion(original);
            setOriginalContractVersion(ov);
          }
          // Prefer the job's in-memory result; fall back to persisted fetch only if missing
          if (!next) {
            try {
              const fresh = await getUserContract(userId);
              if (fresh?.json) next = fresh.json;
            } catch {}
          }
          if (!next) {
            setOptimizationError(
              "New contract not available in response. Please contact support."
            );
            return;
          }
          setOptimizedContractJson(JSON.stringify(next, null, 2));
          const v = extractVersion(next);
          setOptimizedContractVersion(v);
          setOptimizationExplanation(status.result?.explanation ?? null);
          try {
            localStorage.removeItem(`optimizationJobId:${userId}`);
          } catch {}
          return;
        }
        if (status.status === "failed") {
          if (intervalId) clearInterval(intervalId);
          if (timeoutId) clearTimeout(timeoutId);
          setIsOptimizing(false);
          const msg = status.error || "Optimization failed.";
          setOptimizationError(msg);
          try {
            localStorage.removeItem(`optimizationJobId:${userId}`);
          } catch {}
          return;
        }
      } catch (err: unknown) {
        localErrorCount += 1;
        setPollErrorCount(localErrorCount);
        if (localErrorCount >= 3) {
          const msg =
            err instanceof Error
              ? err.message
              : "Network error during polling.";
          setOptimizationError(msg);
        }
      }
    };

    intervalId = window.setInterval(check, 5000);
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
            Configuration Contract and AI Optimization
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
                      <IconLoader2
                        className="size-4 animate-spin"
                        aria-hidden
                      />
                      Loading contract…
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowContractJson((v) => !v)}
                    aria-expanded={showContractJson}
                    aria-controls="contract-json"
                    disabled={!contractJson || contractLoading}
                  >
                    {contractJson ? (showContractJson ? "Hide JSON" : "Show JSON") : "Show JSON"}
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadContract}
                    aria-label="Retry loading contract"
                  >
                    Retry
                  </Button>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Contract Version: {contractVersion || "—"}
              </div>
              {contractExplanation && (
                <div className="mt-2 rounded-md border bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Latest Optimization Explanation</div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowContractExplanation((v) => !v)}
                      aria-expanded={showContractExplanation}
                      aria-controls="latest-optimization-explanation"
                    >
                      {showContractExplanation ? "Hide" : "Show"}
                    </Button>
                  </div>
                  {showContractExplanation && (
                    <div
                      id="latest-optimization-explanation"
                      className="prose prose-sm max-w-none whitespace-pre-wrap mt-2"
                    >
                      {contractExplanation}
                    </div>
                  )}
                </div>
              )}
              {contractJson && showContractJson ? (
                <div
                  id="contract-json"
                  className="rounded-lg border bg-muted p-3 overflow-auto min-h-48"
                  aria-label="Contract JSON"
                >
                  <pre className="font-mono text-xs leading-relaxed">
                    <code
                      dangerouslySetInnerHTML={{
                        __html: highlightJson(contractJson),
                      }}
                    />
                  </pre>
                </div>
              ) : !contractJson ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  No contract assigned to this user yet.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Event Analysis</span>
                <div className="inline-flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => userId && analyzeEvents(userId)}
                    aria-label="Analyze Events"
                    disabled={!userId || analysisLoading}
                  >
                    {analysisLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <IconLoader2
                          className="size-4 animate-spin"
                          aria-hidden
                        />
                        Analyzing…
                      </span>
                    ) : (
                      <span>Analyze Events</span>
                    )}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-3">
              {analysisLoading && (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="inline-flex items-center gap-2">
                    <IconLoader2 className="size-4 animate-spin" aria-hidden />
                    <span>Analysis in progress… Please wait.</span>
                  </div>
                </div>
              )}
              {analysisError && (
                <div className="flex items-center justify-between rounded-md border border-destructive px-3 py-2 text-destructive">
                  <div className="flex items-center gap-2 text-sm">
                    <IconAlertTriangle className="size-4" aria-hidden />
                    <span>Failed to analyze events: {analysisError}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => userId && analyzeEvents(userId)}
                    aria-label="Retry analysis"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {Array.isArray(painPoints) && painPoints.length > 0 && (
                <div className="rounded-md border bg-muted p-3">
                  <div className="text-sm font-medium mb-2">
                    Detected Pain Points
                  </div>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {painPoints.map((pp) => (
                      <li key={pp.id}>
                        <span className="font-medium">{pp.type}</span>
                        {pp.page ? <span> — {pp.page}</span> : null}
                        {pp.component ? <span> / {pp.component}</span> : null}
                        {pp.timestamp ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {formatDateTime(pp.timestamp)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(painPoints) && painPoints.length === 0 && !analysisLoading && !analysisError && (
                <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
                  No pain points detected for this user.
                </div>
              )}

              {Array.isArray(improvements) && improvements.length > 0 && (
                <div className="rounded-md border bg-muted p-3">
                  <div className="text-sm font-medium mb-2">Suggested Improvements</div>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {improvements.map((imp, idx) => (
                      <li key={`${imp.title}-${idx}`}>
                        <span className="font-medium">{imp.title}</span>
                        {imp.priority ? (
                          <span className="text-muted-foreground"> — {imp.priority}</span>
                        ) : null}
                        {imp.page ? <span> — {imp.page}</span> : null}
                        {imp.elementId ? <span> / {imp.elementId}</span> : null}
                        {imp.description ? (
                          <span className="block text-muted-foreground">{imp.description}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(painPoints) && painPoints.length > 0 && (
                <div className="flex items-center justify-end">
                  <Button
                    onClick={onOptimize}
                    disabled={!canOptimize}
                    aria-label="Optimize UI with This Analysis"
                    title={disabledReason}
                  >
                    Optimize UI with This Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AI Optimization</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {optimizationError && (
                <div className="flex items-center justify-between rounded-md border border-destructive px-3 py-2 text-destructive">
                  <div className="flex items-center gap-2 text-sm">
                    <IconAlertTriangle className="size-4" aria-hidden />
                    <span>
                      Failed to start optimization: {optimizationError}
                    </span>
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
                      {optimizationJobId
                        ? `Job ID: ${optimizationJobId}`
                        : "Starting…"}{" "}
                      • Elapsed time: {elapsedSeconds}s
                      {pollErrorCount > 0 && (
                        <span className="ml-2">
                          • Poll errors: {pollErrorCount}
                        </span>
                      )}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInfoBanner(false)}
                    aria-label="Dismiss optimization status"
                  >
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
                  <span className="text-xs text-muted-foreground">
                    Job ID: {optimizationJobId || "—"}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end">
                <Button
                  onClick={onOptimize}
                  disabled={!canOptimize}
                  aria-label={contractJson ? "Optimize Contract with AI" : "Generate Personalized Contract"}
                  title={disabledReason}
                >
                  {isOptimizing || contractLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <IconLoader2
                        className="size-4 animate-spin"
                        aria-hidden
                      />
                      Optimizing…
                    </span>
                  ) : (
                    <span>{ctaLabel}</span>
                  )}
                </Button>
              </div>

              {optimizedContractJson && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>
                            Original Contract{" "}
                            {originalContractVersion
                              ? `(Version ${originalContractVersion})`
                              : ""}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowOriginalJson((v) => !v)}
                            aria-expanded={showOriginalJson}
                            aria-controls="original-contract-json"
                          >
                            {showOriginalJson ? "Hide JSON" : "Show JSON"}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {showOriginalJson ? (
                          originalContractJson ? (
                            <div
                              id="original-contract-json"
                              className="rounded-lg border bg-muted p-3 overflow-auto min-h-48"
                              aria-label="Original Contract JSON"
                            >
                              <pre className="font-mono text-xs leading-relaxed">
                                <code
                                  dangerouslySetInnerHTML={{
                                    __html: highlightJsonSafe(
                                      originalContractJson
                                    ),
                                  }}
                                />
                              </pre>
                            </div>
                          ) : (
                            <div className="rounded-md border p-3 text-sm text-muted-foreground">
                              No original snapshot captured.
                            </div>
                          )
                        ) : null}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>
                            Optimized Contract{" "}
                            {optimizedContractVersion
                              ? `(Version ${optimizedContractVersion})`
                              : ""}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowOptimizedJson((v) => !v)}
                            aria-expanded={showOptimizedJson}
                            aria-controls="optimized-contract-json"
                          >
                            {showOptimizedJson ? "Hide JSON" : "Show JSON"}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {showOptimizedJson && (
                          <div
                            id="optimized-contract-json"
                            className="rounded-lg border bg-muted p-3 overflow-auto min-h-48"
                            aria-label="Optimized Contract JSON"
                          >
                            <pre className="font-mono text-xs leading-relaxed">
                              <code
                                dangerouslySetInnerHTML={{
                                  __html: highlightJsonSafe(
                                    optimizedContractJson
                                  ),
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowExplanation((v) => !v)}
                        aria-expanded={showExplanation}
                        aria-controls="optimization-explanation"
                      >
                        {showExplanation ? "Hide" : "Show"}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {optimizationExplanation ? (
                        <div
                          id="optimization-explanation"
                          className="prose prose-sm max-w-none whitespace-pre-wrap"
                        >
                          {optimizationExplanation}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          The LLM did not provide an explanation for this
                          optimization.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="default"
                      disabled
                      title="Not implemented in MVP"
                    >
                      Accept Optimization
                    </Button>
                    <Button variant="outline" onClick={onOptimize}>
                      Reject & Try Again
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowExplanation(true);
                        const el = document.getElementById("optimization-explanation");
                        el?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      title="Scroll to explanation"
                    >
                      View Diff
                    </Button>
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
