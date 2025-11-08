import { useMemo, useState, useEffect, useCallback } from "react";
import type { User } from "@/lib/types";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconSearch,
  IconLoader2,
  IconAlertTriangle,
} from "@tabler/icons-react";

interface UsersTableProps {
  onSelectUser: (userId: string) => void;
  selectedUserId?: string | null;
}

export default function UsersTable({
  onSelectUser,
  selectedUserId,
}: UsersTableProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await getUsers();
      const valid = fetched.filter((u) => {
        const ok = !!u.id && !!u.username;
        if (!ok) console.warn("Skipping invalid user record", u);
        return ok;
      });
      setUsers(valid);
    } catch (e) {
      setError("Failed to load users. Please check backend connectivity.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? users.filter((u) =>
          `${u.username} ${u.email ?? ""}`.toLowerCase().includes(q)
        )
      : users;
    return arr;
  }, [users, query]);

  const total = users.length;
  const count = filtered.length;

  return (
    <Card className="py-2 gap-2">
      <CardHeader className="flex items-center justify-between px-4">
        <CardTitle className="text-base">Users</CardTitle>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <IconSearch
              className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Search by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="pl-8 h-8"
            />
          </div>
          <div className="text-xs text-muted-foreground" aria-live="polite">
            {`Showing ${count} of ${total} users`}
          </div>
          {loading && (
            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" aria-hidden />
              <span>Loading…</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2 space-y-2">
        {error && (
          <div className="flex items-center justify-between rounded-md border border-destructive px-3 py-2 text-destructive">
            <div className="flex items-center gap-2 text-sm">
              <IconAlertTriangle className="size-4" aria-hidden />
              <span>
                Failed to load users. Please check backend connectivity.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadUsers}
              aria-label="Retry loading users"
            >
              Retry
            </Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Contract Version</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && !loading && !error && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-sm text-muted-foreground"
                >
                  {total === 0
                    ? "No users available"
                    : "No users found. Try a different search term."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => {
              const selected = selectedUserId === u.id;
              const version = u.contractVersion || "—";
              return (
                <TableRow
                  key={u.id}
                  className={selected ? "bg-muted/60" : "cursor-pointer"}
                  data-selected={selected || undefined}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSelectUser(u.id);
                  }}
                >
                  <TableCell
                    className={selected ? "font-semibold" : "font-medium"}
                  >
                    {u.username}
                  </TableCell>
                  <TableCell className="text-sm">{u.email ?? "—"}</TableCell>
                  <TableCell className="text-sm">{version}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => onSelectUser(u.id)}
                      aria-label={`View details for ${u.username}`}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
