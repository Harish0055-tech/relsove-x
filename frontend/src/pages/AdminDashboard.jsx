import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueries } from "@/context/QueryContext";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Inbox, Clock, CheckCircle2, AlertCircle, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const resolverCategories = ["IT Support", "HR", "Facilities", "Finance", "General"];

const getDisplayName = (entity) => {
  const fullName = String(entity?.fullName || "").trim();
  if (fullName) return fullName;

  const legacyName = String(entity?.name || "").trim();
  if (legacyName) return legacyName;

  const username = String(entity?.username || "").trim();
  if (!username) return "Unknown User";

  return username.includes("@") ? username.split("@")[0] : username;
};
const PRIORITY_SLA_MINUTES = {
  critical: 45,
  high: 180,
  medium: 360,
};

function SuperAdminPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "resolvers" ? "resolvers" : "users";
  const token = localStorage.getItem("token");
  const [users, setUsers] = useState([]);
  const [resolvers, setResolvers] = useState([]);
  const [resolverEmail, setResolverEmail] = useState("");
  const [resolverPassword, setResolverPassword] = useState("");
  const [resolverCategory, setResolverCategory] = useState("IT Support");
  const [roleDraft, setRoleDraft] = useState({});

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const loadUsers = async () => {
    const res = await fetch("/api/auth/admin/users", { headers: authHeaders });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.message || "Failed to load users");
    setUsers(data);
  };

  const loadResolvers = async () => {
    const res = await fetch("/api/auth/admin/resolvers", { headers: authHeaders });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.message || "Failed to load resolvers");
    setResolvers(data);
  };

  const refreshAll = async () => {
    try {
      await Promise.all([loadUsers(), loadResolvers()]);
    } catch (err) {
      toast.error(err.message || "Failed to load management data");
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleDeleteUser = async (id) => {
    const res = await fetch(`/api/auth/admin/users/${id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.message || "Failed to delete user");
      return;
    }
    toast.success("User deleted");
    await loadUsers();
  };

  const handleCreateResolver = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/auth/admin/resolvers", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: resolverEmail,
        password: resolverPassword,
        category: resolverCategory,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.message || "Failed to create resolver");
      return;
    }
    toast.success("Resolver created");
    setResolverEmail("");
    setResolverPassword("");
    setResolverCategory("IT Support");
    await loadResolvers();
  };

  const handleUpdateResolverCategory = async (resolver) => {
    const category = roleDraft[resolver._id] || resolver.category;
    const res = await fetch(`/api/auth/admin/resolvers/${resolver._id}/category`, {
      method: "PATCH",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.message || "Failed to update resolver category");
      return;
    }
    toast.success("Resolver category updated");
    await loadResolvers();
  };

  const handleDeleteResolver = async (resolver) => {
    const res = await fetch(`/api/auth/admin/resolvers/${resolver._id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.message || "Failed to delete resolver");
      return;
    }
    toast.success("Resolver deleted");
    await loadResolvers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Portal</h1>
        <p className="text-sm text-muted-foreground">Manage users and resolver accounts</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val })}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="resolvers">Resolvers</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>{getDisplayName(user)}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user._id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolvers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Resolver</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-4" onSubmit={handleCreateResolver}>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={resolverEmail} onChange={(e) => setResolverEmail(e.target.value)} placeholder="resolver@company.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input value={resolverPassword} onChange={(e) => setResolverPassword(e.target.value)} placeholder="Password" required />
                </div>
                <div className="space-y-2">
                  <Label>Category / Role</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={resolverCategory}
                    onChange={(e) => setResolverCategory(e.target.value)}
                  >
                    {resolverCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">Create Resolver</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resolver Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Update Category</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvers.map((resolver) => (
                    <TableRow key={resolver._id}>
                      <TableCell>{getDisplayName(resolver)}</TableCell>
                      <TableCell>{resolver.username}</TableCell>
                      <TableCell>{resolver.category || "Unassigned"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <select
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            value={roleDraft[resolver._id] ?? resolver.category ?? "IT Support"}
                            onChange={(e) => setRoleDraft((prev) => ({ ...prev, [resolver._id]: e.target.value }))}
                          >
                            {resolverCategories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <Button size="sm" onClick={() => handleUpdateResolverCategory(resolver)}>
                            Update
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteResolver(resolver)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {resolvers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No resolvers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResolverDashboard() {
  const { queries, updateQueryStatus, deleteQuery } = useQueries();
  const { userFullName, userCategory } = useAuth();
  const [filter, setFilter] = useState("all");
  const [nowTick, setNowTick] = useState(Date.now());
  const notifiedOverdueRef = useRef(new Set());
  const navigate = useNavigate();

  const counts = useMemo(() => ({
    total: queries.length,
    open: queries.filter((q) => q.status === "open").length,
    inProgress: queries.filter((q) => q.status === "in-progress").length,
    resolved: queries.filter((q) => q.status === "resolved").length,
  }), [queries]);

  const filtered = useMemo(
    () => (filter === "all" ? queries : queries.filter((q) => q.status === filter)),
    [queries, filter]
  );

  const overdueAlerts = useMemo(() => {
    return queries
      .filter((q) => q.status === "open")
      .map((q) => {
        const threshold = PRIORITY_SLA_MINUTES[q.priority];
        if (!threshold) return null;

        const createdAt = new Date(q.createdAt).getTime();
        if (!createdAt || Number.isNaN(createdAt)) return null;

        const elapsedMinutes = Math.floor((nowTick - createdAt) / 60000);
        if (elapsedMinutes < threshold) return null;

        return {
          ...q,
          threshold,
          elapsedMinutes,
          overdueByMinutes: elapsedMinutes - threshold,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.overdueByMinutes - a.overdueByMinutes);
  }, [queries, nowTick]);

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const activeKeys = new Set(overdueAlerts.map((q) => q.id));

    for (const key of Array.from(notifiedOverdueRef.current)) {
      if (!activeKeys.has(key)) {
        notifiedOverdueRef.current.delete(key);
      }
    }

    overdueAlerts.forEach((q) => {
      const key = q.id;
      if (notifiedOverdueRef.current.has(key)) return;

      toast.error(
        `SLA alert: ${q.id} (${q.priority}) has been open for ${q.elapsedMinutes} min`
      );
      notifiedOverdueRef.current.add(key);
    });
  }, [overdueAlerts]);

  const handleStatusUpdate = (e, id, status) => {
    e.stopPropagation();
    updateQueryStatus(id, status);
    toast.success(`Status updated to ${status}`);
  };

  const handleDelete = (e, id, subject) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete query "${subject}"?`)) {
      deleteQuery(id);
      toast.success("Query deleted successfully");
    }
  };

  const summaryCards = [
    { label: "Total Queries", count: counts.total, icon: Inbox, color: "text-primary" },
    { label: "Open", count: counts.open, icon: AlertCircle, color: "text-[hsl(var(--info))]" },
    { label: "In Progress", count: counts.inProgress, icon: Clock, color: "text-[hsl(var(--warning))]" },
    { label: "Resolved", count: counts.resolved, icon: CheckCircle2, color: "text-[hsl(var(--success))]" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resolver Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {userFullName ? `${userFullName}` : "Resolver"}
            {userCategory ? ` · ${userCategory}` : ""}
            {" — Manage and resolve support queries"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-amber-400/50 bg-amber-50/40 dark:bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-700 dark:text-amber-300">
            Pending Attention ({overdueAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {overdueAlerts.length === 0 && (
            <p className="text-sm text-muted-foreground">No notifications</p>
          )}
          {overdueAlerts.slice(0, 5).map((q) => (
            <button
              key={q.id}
              onClick={() => navigate(`/queries/${q.id}`)}
              className="flex w-full items-center justify-between rounded-md border bg-background/80 px-3 py-2 text-left hover:bg-muted/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{q.id} - {q.subject}</p>
                <p className="text-xs text-muted-foreground">
                  Priority {q.priority} | Open {q.elapsedMinutes} min | SLA {q.threshold} min
                </p>
              </div>
              <span className="ml-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                +{q.overdueByMinutes} min
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Queries</CardTitle>
            <div className="flex gap-1">
              {["all", "open", "in-progress", "resolved", "closed"].map((sf) => (
                <Button key={sf} variant={filter === sf ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setFilter(sf)}>
                  {sf === "in-progress" ? "In Progress" : sf.charAt(0).toUpperCase() + sf.slice(1)}
                </Button>
              ))}
            </div>
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
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => (
                <TableRow key={q.id} className="cursor-pointer" onClick={() => navigate(`/queries/${q.id}`)}>
                  <TableCell className="font-mono text-xs">{q.id}</TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium">{q.subject}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{q.category}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{q.submittedBy || "—"}</TableCell>
                  <TableCell><PriorityBadge priority={q.priority} /></TableCell>
                  <TableCell><StatusBadge status={q.status} /></TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{format(new Date(q.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleStatusUpdate(e, q.id, "open")}>Mark as Open</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleStatusUpdate(e, q.id, "in-progress")}>Mark as In Progress</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleStatusUpdate(e, q.id, "resolved")}>Mark as Resolved</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleStatusUpdate(e, q.id, "closed")}>Mark as Closed</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDelete(e, q.id, q.subject)} className="text-destructive focus:text-destructive">
                          Delete Query
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No queries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const { isSuperAdmin } = useAuth();
  return <AppLayout>{isSuperAdmin ? <SuperAdminPortal /> : <ResolverDashboard />}</AppLayout>;
}
