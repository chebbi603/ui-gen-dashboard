import { useState } from "react";
import type { UserContract } from "@/data/mockUsers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconChevronRight, IconChevronDown, IconCirclePlus, IconCircleMinus, IconCircleCheck, IconCircleX } from "@tabler/icons-react";

export type DiffNode = {
  key?: string;
  path: string[];
  type: "add" | "remove" | "change" | "same";
  a?: unknown;
  b?: unknown;
  children?: DiffNode[];
};

function isPlainObject(x: unknown) {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function buildDiff(a: unknown, b: unknown, path: string[] = []): DiffNode {
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Array.from(new Set([...Object.keys(a as any), ...Object.keys(b as any)])).sort();
    const children = keys.map((k) => buildDiff((a as any)[k], (b as any)[k], [...path, k]));
    const type: DiffNode["type"] = children.every((c) => c.type === "same") ? "same" : "change";
    return { path, type, children };
  }
  if (a === undefined && b !== undefined) return { path, type: "add", b };
  if (a !== undefined && b === undefined) return { path, type: "remove", a };
  if (JSON.stringify(a) === JSON.stringify(b)) return { path, type: "same", a, b };
  return { path, type: "change", a, b };
}

function PathLabel({ path }: { path: string[] }) {
  return <span className="font-mono text-xs text-muted-foreground">{path.join(".") || "root"}</span>;
}

function NodeRow({ node, depth }: { node: DiffNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const isBranch = !!node.children && node.children.length > 0;
  return (
    <div>
      <div className="flex items-center gap-2 py-1 pl-2" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
        {isBranch ? (
          <button className="text-muted-foreground" onClick={() => setOpen((o) => !o)} aria-label={open ? "Collapse" : "Expand"}>
            {open ? <IconChevronDown className="size-4" /> : <IconChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="size-4" />
        )}
        <PathLabel path={node.path} />
        {node.type === "add" && (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs"><IconCirclePlus className="size-4" /> added</span>
        )}
        {node.type === "remove" && (
          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs"><IconCircleMinus className="size-4" /> removed</span>
        )}
        {node.type === "change" && !isBranch && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">changed</span>
        )}
      </div>
      {isBranch && open && (
        <div className="border-l pl-2">
          {node.children!.map((c, i) => (
            <NodeRow key={i} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
      {!isBranch && node.type !== "same" && (
        <div className="grid grid-cols-2 gap-2 px-6">
          <div className="rounded-md border p-2">
            <div className="text-xs text-muted-foreground mb-1">Current</div>
            <pre className="font-mono text-xs overflow-auto">{JSON.stringify(node.a, null, 2)}</pre>
          </div>
          <div className="rounded-md border p-2">
            <div className="text-xs text-muted-foreground mb-1">Generated</div>
            <pre className="font-mono text-xs overflow-auto">{JSON.stringify(node.b, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContractDiff({ current, next, onApprove, onDiscard }: {
  current: UserContract;
  next: UserContract;
  onApprove: () => void;
  onDiscard: () => void;
}) {
  const root = buildDiff(current, next);
  return (
    <Card>
      <CardHeader className="flex items-center justify-between p-4">
        <CardTitle className="text-base">Contract Diff</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onDiscard}>
            <IconCircleX className="size-4" />
            <span className="ml-1 text-sm">Discard</span>
          </Button>
          <Button size="sm" onClick={onApprove}>
            <IconCircleCheck className="size-4" />
            <span className="ml-1 text-sm">Approve</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <NodeRow node={root} depth={0} />
      </CardContent>
    </Card>
  );
}