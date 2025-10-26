import { useMemo, useState } from "react";
import type { User } from "../data/mockUsers";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "./ui/table";
import { IconSearch, IconSortAscending } from "@tabler/icons-react";

interface UsersTableProps {
  users: User[];
  onSelect: (user: User) => void;
}

export default function UsersTable({ users, onSelect }: UsersTableProps) {
  const [query, setQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    return users
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
  }, [users, query, sortAsc]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between p-4">
        <CardTitle className="text-base">Users</CardTitle>
        <div className="flex items-center gap-2">
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
      <CardContent className="p-0">
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
