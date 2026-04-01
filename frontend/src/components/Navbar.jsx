import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, PlusCircle, List, Bell, User } from "lucide-react";

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
import { ModeToggle } from "@/components/mode-toggle";

export function Navbar() {
  const { pathname } = useLocation();
  const { logout, userRole, userFullName, userUsername, userCategory } = useAuth();

  const navItems = userRole === 'admin'
    ? [
      { label: "Admin Dashboard", path: "/", icon: LayoutDashboard },
    ]
    : [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Submit Query", path: "/submit", icon: PlusCircle },
      { label: "My Queries", path: "/queries", icon: List },
    ];

  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="flex h-14 items-center gap-4 px-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight text-primary mr-4">
          <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs font-black">
            RX
          </div>
          <span className="hidden sm:inline">Resolve X</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={pathname === item.path ? "secondary" : "ghost"}
                size="sm"
                className={cn("gap-1.5 text-sm", pathname === item.path && "font-semibold")}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />


        {/* Theme Toggle */}
        <ModeToggle />

        {/* Right side */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userFullName || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">{userUsername || "username"}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary capitalize">
                    {userRole || "user"}
                  </span>
                  {userRole === 'admin' && userCategory && (
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground">
                      {userCategory}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
