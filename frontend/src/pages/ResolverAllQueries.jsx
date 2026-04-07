import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueries } from "@/context/QueryContext";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_OPTIONS = ["all", "critical", "high", "medium", "low"];

export default function ResolverAllQueries() {
  const { queries } = useQueries();
  const { userRole, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  if (userRole !== "admin" || isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredQueries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return queries.filter((q) => {
      const priorityMatch = priorityFilter === "all" || q.priority === priorityFilter;

      if (!priorityMatch) return false;
      if (!normalizedSearch) return true;

      return (
        String(q.id || "").toLowerCase().includes(normalizedSearch) ||
        String(q.subject || "").toLowerCase().includes(normalizedSearch) ||
        String(q.category || "").toLowerCase().includes(normalizedSearch) ||
        String(q.submittedBy || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [priorityFilter, queries, search]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Queries</h1>
          <p className="text-sm text-muted-foreground">
            Search and filter tickets by priority. Click a row to update status.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resolver Query List ({filteredQueries.length})</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by ID, subject, category or user..."
                  className="pl-8"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority === "all" ? "All Priorities" : priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Submitted By</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQueries.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer" onClick={() => navigate(`/queries/${q.id}`)}>
                    <TableCell className="font-mono text-xs">{q.id}</TableCell>
                    <TableCell className="max-w-[260px] truncate font-medium">{q.subject}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{q.category}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{q.submittedBy || "-"}</TableCell>
                    <TableCell><PriorityBadge priority={q.priority} /></TableCell>
                    <TableCell><StatusBadge status={q.status} /></TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {format(new Date(q.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredQueries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No queries found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

