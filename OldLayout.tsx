/**
 * Layout.tsx - Dashboard shell (sidebar + header + content area)
 * Wraps all dashboard pages. Sidebar shows role-specific nav links; header has user menu and logout.
 */
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/Sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  BookOpen,
  LayoutDashboard,
  GraduationCap,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

// Sidebar link list per role (student, teacher, parent); used to render nav items
const roleNavMap: Record<string, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
  student: [
    { href: "/", label: "Home", icon: LayoutDashboard }, // Changed to root path
    { href: "/attendance", label: "Attendance", icon: BookOpen }, // Attendance screen.
    { href: "/student/courses", label: "My Courses", icon: BookOpen }, // Updated to use unified LMS route
    { href: "/student/assignments", label: "Assignments", icon: GraduationCap },
    { href: "/student/grades", label: "Grades", icon: GraduationCap },
  ],
  admin: [
    { href: "/", label: "Home", icon: LayoutDashboard }, // Admin home.
    { href: "/admin/courses", label: "Subjects", icon: BookOpen }, // Manage subjects.
  ],
  teacher: [
    { href: "/", label: "Home", icon: LayoutDashboard }, // Changed to root path
    { href: "/teacher/classes", label: "Classes", icon: BookOpen },
    { href: "/teacher/assignments", label: "Assignments", icon: GraduationCap },
    { href: "/teacher/gradebook", label: "Gradebook", icon: GraduationCap },
  ],
  parent: [
    { href: "/", label: "Home", icon: LayoutDashboard }, // Changed to root path
    { href: "/parent/grades", label: "Grades", icon: GraduationCap },
  ],
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Default to student nav if role missing
  const role = user?.role || "student";
  const roleNav = roleNavMap[role] || roleNavMap.student;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Highlight current nav item: exact match for dashboard links, prefix match for others
  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/student/dashboard" || href === "/teacher/dashboard" || href === "/parent/dashboard") {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex h-14 items-center gap-2 px-4">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="text-base">EduConnect</span>
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {roleNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                      <Link to={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>General</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/settings")}>
                    <Link to="/settings" className="flex items-center gap-3">
                      <Settings className="h-4 w-4 shrink-0" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarSeparator />
          <div className="p-2">
            <p className="text-xs text-muted-foreground px-2 py-1 truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-muted-foreground px-2 pb-2 capitalize">
              {role}
            </p>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex flex-1 items-center justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 py-1.5 h-auto"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {(user?.name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block text-sm font-medium truncate max-w-[120px]">
                    {user?.name || "User"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1 p-6 md:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
