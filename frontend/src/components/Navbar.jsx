import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, PlusCircle, List, Bell, Users, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useQueries } from "@/context/QueryContext";
import { ModeToggle } from "@/components/mode-toggle";

const RESOLVER_SLA_MINUTES = {
  critical: 45,
  high: 180,
  medium: 360,
};
const ADMIN_SLA_MINUTES = {
  critical: 60,
  high: 360,
  medium: 720,
};
const RESOLVED_STATUSES = new Set(["resolved", "closed"]);
const ROLE_CHANGE_NOTIF_KEY = "resolver-role-change-notifs";
const LAST_KNOWN_CATEGORY_KEY_PREFIX = "resolver-last-known-category";

function getResolverCategorySnapshotKey(username) {
  return `${LAST_KNOWN_CATEGORY_KEY_PREFIX}:${String(username || "").toLowerCase()}`;
}

export function Navbar() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { queries, fetchQueries } = useQueries();
  const [nowTick, setNowTick] = useState(Date.now());
  const [roleChangeNotifications, setRoleChangeNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ROLE_CHANGE_NOTIF_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const { logout, userRole, userFullName, userUsername, userCategory, isSuperAdmin } = useAuth();
  const isResolver = userRole === "admin" && !isSuperAdmin;
  const isAnyAdmin = userRole === "admin";

  const activeSlaMinutes = useMemo(() => {
    if (!isAnyAdmin) return null;
    return isSuperAdmin ? ADMIN_SLA_MINUTES : RESOLVER_SLA_MINUTES;
  }, [isAnyAdmin, isSuperAdmin]);

  const currentPath =
    userRole === "admin" && isSuperAdmin && pathname === "/" && !search
      ? "/?tab=users"
      : `${pathname}${search || ""}`;

  const navItems =
    userRole === "admin"
      ? isSuperAdmin
        ? [
            { label: "Users", path: "/?tab=users", icon: Users },
            { label: "Resolvers", path: "/?tab=resolvers", icon: ShieldCheck },
          ]
        : [
            { label: "Resolver Dashboard", path: "/", icon: LayoutDashboard },
            { label: "All Queries", path: "/resolver/queries", icon: List },
          ]
      : [
          { label: "Dashboard", path: "/", icon: LayoutDashboard },
          { label: "Submit Query", path: "/submit", icon: PlusCircle },
          { label: "My Queries", path: "/queries", icon: List },
        ];

  const getInitials = () => {
    if (!userFullName) return "U";
    return userFullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const overdueAlerts = useMemo(() => {
    if (!activeSlaMinutes) return [];

    return queries
      .filter((q) => !RESOLVED_STATUSES.has(q.status))
      .map((q) => {
        const threshold = activeSlaMinutes[q.priority];
        if (!threshold) return null;

        const createdAt = new Date(q.createdAt).getTime();
        if (!createdAt || Number.isNaN(createdAt)) return null;

        const elapsedMinutes = Math.floor((nowTick - createdAt) / 60000);
        if (elapsedMinutes < threshold) return null;

        return {
          ...q,
          elapsedMinutes,
          overdueByMinutes: elapsedMinutes - threshold,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.overdueByMinutes - a.overdueByMinutes);
  }, [activeSlaMinutes, nowTick, queries]);

  const userAssignmentNotifications = useMemo(() => {
    if (userRole !== "user") return [];

    return queries
      .flatMap((q) =>
        (q.activities || [])
          .filter((activity) => activity.type === "assignment")
          .map((activity, index) => ({
            id: `assignment-${q.id}-${activity.timestamp || index}`,
            type: "assignment",
            title: `${q.id} reassigned`,
            description: activity.content || "Resolver assignment updated",
            path: `/queries/${q.id}`,
            createdAt: activity.timestamp || q.updatedAt || q.createdAt || new Date().toISOString(),
          }))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);
  }, [queries, userRole]);

  const bellNotifications = useMemo(() => {
    const slaNotifications = overdueAlerts.map((q) => ({
      id: `sla-${q.id}`,
      type: "sla",
      title: `${q.id} (${q.priority})`,
      description: `Not resolved for ${q.elapsedMinutes} min (SLA ${activeSlaMinutes?.[q.priority]} min)`,
      path: `/queries/${q.id}`,
      createdAt: q.createdAt || new Date().toISOString(),
    }));

    if (userRole === "user") {
      return userAssignmentNotifications;
    }

    return [...roleChangeNotifications, ...slaNotifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeSlaMinutes, overdueAlerts, roleChangeNotifications, userAssignmentNotifications, userRole]);

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userRole) return;

    fetchQueries();
    const interval = setInterval(() => {
      fetchQueries();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchQueries, userRole]);

  useEffect(() => {
    localStorage.setItem(ROLE_CHANGE_NOTIF_KEY, JSON.stringify(roleChangeNotifications));
  }, [roleChangeNotifications]);

  useEffect(() => {
    if (!isResolver || !userUsername) return;

    const token = localStorage.getItem("token");
    if (!token) return;
    const snapshotKey = getResolverCategorySnapshotKey(userUsername);

    const checkResolverRoleChange = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();

        const latestCategoryRaw = (data?.category || "").trim();
        const latestCategoryNormalized = latestCategoryRaw.toLowerCase();
        const previousCategoryRaw = localStorage.getItem(snapshotKey);
        const previousCategoryNormalized = String(previousCategoryRaw || "").trim().toLowerCase();

        if (previousCategoryRaw === null) {
          localStorage.setItem(snapshotKey, latestCategoryRaw);
          return;
        }

        if (previousCategoryNormalized !== latestCategoryNormalized) {
          const notification = {
            id: `role-change-${Date.now()}`,
            type: "role_change",
            title: "Resolver role/category updated",
            description: `Changed from ${previousCategoryRaw || "Unassigned"} to ${latestCategoryRaw || "Unassigned"}`,
            createdAt: new Date().toISOString(),
          };

          setRoleChangeNotifications((prev) => [notification, ...prev].slice(0, 20));
          localStorage.setItem(snapshotKey, latestCategoryRaw);
        }
      } catch {
        // no-op
      }
    };

    checkResolverRoleChange();
    const interval = setInterval(checkResolverRoleChange, 60000);
    return () => clearInterval(interval);
  }, [isResolver, userUsername]);

  useEffect(() => {
    if (isResolver) return;
    setRoleChangeNotifications([]);
    localStorage.removeItem(ROLE_CHANGE_NOTIF_KEY);
  }, [isResolver]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">

        {/* Brand */}
        <Link to="/" className="mr-4 flex items-center gap-2 text-lg font-bold tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-slate-900 text-white font-extrabold shadow-md dark:border-slate-500 dark:bg-slate-100 dark:text-slate-900">
            RX
          </div>
          <span className="hidden sm:inline text-slate-900 dark:text-white">
            Resolve X
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5 text-sm rounded-md transition",
                  currentPath === item.path
                    ? "bg-white dark:bg-slate-900 shadow-sm font-semibold"
                    : "text-slate-600 dark:text-slate-300"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Theme */}
        <ModeToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-4 w-4" />
              {bellNotifications.length > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                  {bellNotifications.length > 99 ? "99+" : bellNotifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {bellNotifications.length === 0 && (
              <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
            )}
            {bellNotifications.slice(0, 8).map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => n.path && navigate(n.path)}
                className="cursor-pointer flex-col items-start gap-1"
              >
                <span className="text-xs font-semibold">
                  {n.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {n.description}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex items-center justify-center rounded-full focus:outline-none">

              {/* FIXED AVATAR */}
              <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-slate-900 dark:text-white shadow-sm transition hover:shadow-md">
                {getInitials()}
              </div>

              {/* Online Dot */}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-900"></span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-64 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg"
          >
            <DropdownMenuLabel>
              <div className="flex items-center gap-3">

                {/* Avatar inside dropdown */}
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold">
                  {getInitials()}
                </div>

                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {userFullName || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userUsername || "username"}
                  </p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center gap-2 mt-3">
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-primary/10 text-primary capitalize">
                  {userRole || "user"}
                </span>

                {userRole === "admin" && userCategory && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-muted text-muted-foreground">
                    {userCategory}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={logout}
              className="text-red-500 focus:text-red-500 cursor-pointer"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
