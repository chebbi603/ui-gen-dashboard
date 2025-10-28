import { useMemo, useState, useEffect } from "react";
import type { User } from "../data/mockUsers";
import { mockUsers } from "@/data/mockUsers";
import { getUsers } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "./ui/table";
import { IconSearch, IconSortAscending, IconLoader2, IconAlertTriangle } from "@tabler/icons-react";

interface UsersTableProps {
  users?: User[];
  onSelect: (user: User) => void;
}

export default function UsersTable({ users, onSelect }: UsersTableProps) {
  const [query, setQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [data, setData] = useState<User[]>(users ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (users && users.length) {
        setData(users);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const fetched = await getUsers();
        if (!cancelled) setData(fetched);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || "Failed to load users");
          // Fallback to mock for offline/local dev
          setData(mockUsers);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [users]);

  const filtered = useMemo(() => {
    return data
      .filter((u) =>
        `${u.name} ${u.contract.version}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
      .sort((a, b) => {
        const aTime = new Date(a.lastActive).getTime();
        const bTime = new Date(b.lastActive).getTime();
        return sortAsc ? aTime - bTime : bTime - aTime;
      });
  }, [data, query, sortAsc]);

  return (
    <Card className="py-2 gap-2">
      <CardHeader className="flex items-center justify-between px-4">
        <CardTitle className="text-base">Users</CardTitle>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" />
              <span>Loading…</span>
            </div>
          )}
          {error && (
            <div className="inline-flex items-center gap-1 text-xs text-destructive">
              <IconAlertTriangle className="size-4" />
              <span>{error}</span>
            </div>
          )}
          <div className="relative">
            <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users"
              className="pl-8 pr-2 py-1 rounded-md border text-sm bg-background"
            />
          </div>
          <button
            onClick={() => setSortAsc((s) => !s)}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
          >
            <IconSortAscending className="size-4" />
            <span>{sortAsc ? "Oldest" : "Newest"}</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Name</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Contract</TableHead>
              <TableHead className="text-right">Pain Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow
                key={u.id}
                className="cursor-pointer"
                onClick={() => onSelect(u)}
              >
                <TableCell className="font-medium text-sm">{u.name}</TableCell>
                <TableCell className="text-sm">
                  {new Date(u.lastActive).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm">v{u.contract.version}</TableCell>
                <TableCell className="text-right text-sm">
                  {u.painPoints.length}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
