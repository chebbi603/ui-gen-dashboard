import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  IconUser,
  IconWand,
  IconAlertTriangle,
  IconLoader2,
  IconCircleCheck,
} from "@tabler/icons-react";
import type { User, PainPoint } from "@/data/mockUsers";
import { generateContractLLM, updateUserContract } from "@/lib/api";
import { parseJSONSafe, validateContractStructure } from "@/lib/validation";

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

function withinRange(ts: string, range: "all" | "24h" | "7d") {
  if (range === "all") return true;
  const now = Date.now();
  const time = new Date(ts).getTime();
  const diff = now - time;
  const day = 24 * 60 * 60 * 1000;
  if (range === "24h") return diff <= day;
  if (range === "7d") return diff <= 7 * day;
  return true;
}

// Color coding by pain point type for quick visual parsing
function typeColorClass(type: string) {
  switch (type) {
    case "rage-click":
      return "text-red-600 dark:text-red-400";
    case "error":
      return "text-destructive"; // resolves to themed destructive color
    case "long dwell":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-foreground";
  }
}

export function UserDetail({
  user,
  open,
  onOpenChange,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<
    "all" | "rage-click" | "error" | "long dwell"
  >("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "24h" | "7d">("all");

  // LLM generation flow
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const init = JSON.stringify(user.contract, null, 2);
      setJsonText(init);
      setJsonError(null);
      setTypeFilter("all");
      setTimeFilter("all");
    }
  }, [user]);

  useEffect(() => {
    // syntax validation
    const { error } = parseJSONSafe(jsonText);
    setJsonError(error);
  }, [jsonText]);

  const filteredPainPoints = useMemo(() => {
    if (!user) return [] as PainPoint[];
    return user.painPoints.filter(
      (p) =>
        (typeFilter === "all" ? true : p.type === typeFilter) &&
        withinRange(p.timestamp, timeFilter)
    );
  }, [user, typeFilter, timeFilter]);

  async function onGenerate() {
    if (!user) return;
    // ensure current JSON is valid and structured before sending
    const parsed = parseJSONSafe(jsonText);
    if (parsed.error) {
      setJsonError(parsed.error);
      return;
    }
    const contractValidation = validateContractStructure(parsed.value);
    if (!contractValidation.valid) {
      setJsonError(contractValidation.errors.join("; "));
      return;
    }

    setIsGenerating(true);
    setSuccessMessage(null);
    try {
      const resp = await generateContractLLM({
        userId: user.id,
        currentContract: parsed.value as any,
        painPoints: user.painPoints,
      });
      const sent = await updateUserContract(user.id, resp.contract);
      if (!sent.success) {
        throw new Error("Failed to send contract update");
      }
      setJsonText(JSON.stringify(resp.contract, null, 2));
      setSuccessMessage("Contract generated and sent.");
    } catch (e) {
      setJsonError((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <IconUser />
            <span>{user?.name ?? "User"}</span>
          </SheetTitle>
          <SheetDescription>
            Configuration contract and UX pain points
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                Configuration Contract (JSON)
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerate}
                disabled={isGenerating || !user}
              >
                {isGenerating ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconWand className="size-4" />
                )}
                <span className="ml-1 text-sm">Generate New Contract</span>
              </Button>
            </div>
            {successMessage && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-sm text-emerald-700">
                <IconCircleCheck className="size-4" />
                <span>Contract generated and sent.</span>
              </div>
            )}
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="bg-background text-foreground w-full min-h-48 rounded-lg border p-3 font-mono text-xs"
                  spellCheck={false}
                />
                {jsonError && (
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    <IconAlertTriangle className="size-4" />
                    <span>{jsonError}</span>
                  </div>
                )}
              </div>
              <div className="rounded-lg border bg-muted p-3 overflow-auto min-h-48">
                <pre className="font-mono text-xs leading-relaxed">
                  <code
                    dangerouslySetInnerHTML={{
                      __html: highlightJson(jsonText),
                    }}
                  />
                </pre>
              </div>
            </div>
          </div>

          {/* Generation success notification shown above editor; diff removed per request */}

          <Separator />

          <div>
            <h3 className="text-base font-semibold mb-2">Pain Points</h3>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-background rounded-md border px-2 py-1.5 text-sm"
              >
                <option value="rage-click">Rage-click</option>
                <option value="error">Error</option>
                <option value="long dwell">Long dwell</option>
              </select>

              <label className="text-xs text-muted-foreground ml-2">
                Range
              </label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="bg-background rounded-md border px-2 py-1.5 text-sm"
              >
                <option value="all">All time</option>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
              </select>
            </div>

            <ul className="space-y-2">
              {filteredPainPoints.map((p) => (
                <li key={p.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        "text-sm font-medium " + typeColorClass(p.type)
                      }
                    >
                      {p.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Page: {p.page} · Component: {p.component}
                  </div>
                </li>
              ))}
              {filteredPainPoints.length === 0 && (
                <li className="rounded-lg border p-3 text-xs text-muted-foreground">
                  No pain points for filters.
                </li>
              )}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
