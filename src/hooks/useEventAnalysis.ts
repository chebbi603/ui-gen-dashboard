import { useCallback, useState } from "react";
import type { PainPoint } from "@/lib/types";
import { analyzeUserEvents, getUserEvents } from "@/lib/api";
import type { ImprovementSuggestion } from "@/lib/api";

export type UseEventAnalysis = {
  painPoints: PainPoint[] | null;
  improvements: ImprovementSuggestion[] | null;
  loading: boolean;
  error: string | null;
  analyzeEvents: (userId: string) => Promise<void>;
};

export function useEventAnalysis(): UseEventAnalysis {
  const [painPoints, setPainPoints] = useState<PainPoint[] | null>(null);
  const [improvements, setImprovements] = useState<
    ImprovementSuggestion[] | null
  >(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeEvents = useCallback(async (userId: string) => {
    if (!userId || !userId.trim()) {
      setError("No user selected.");
      setPainPoints(null);
      setImprovements(null);
      return;
    }
    // Validate ObjectId (24 hex chars) to prevent malformed requests
    const trimmed = userId.trim();
    if (!/^[0-9a-fA-F]{24}$/.test(trimmed)) {
      setError("Invalid user id format.");
      setPainPoints(null);
      setImprovements(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Pre-check: ensure there are events before calling the LLM
      const events = await getUserEvents(trimmed);
      if (!Array.isArray(events) || events.length === 0) {
        setError("No tracking events found for this user.");
        setPainPoints([]);
        setImprovements([]);
        return;
      }
      const { painPoints: points, improvements: imps } =
        await analyzeUserEvents(trimmed);
      setPainPoints(points);
      setImprovements(imps);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to analyze events.";
      setError(msg);
      setPainPoints(null);
      setImprovements(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { painPoints, improvements, loading, error, analyzeEvents };
}
