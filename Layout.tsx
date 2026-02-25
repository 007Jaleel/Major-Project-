import { useAuth } from "@/hooks/useAuth"; // Import auth hook for user state and logout.
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Import Avatar components for user initials.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // Import Dialog components for profile modal.
import { Input } from "@/components/ui/input"; // Import Input for editable form fields.
import { Label } from "@/components/ui/label"; // Import Label for form field labels.
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/Sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { Home, LayoutDashboard, LogOut, PanelLeft, Users, Settings, BookOpen, GraduationCap, Save, Loader2, UserCircle, Calendar, Calendar as CalendarIcon } from "lucide-react"; // Import Calendar icon for attendance and CalendarIcon for timetable
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link, Outlet } from "react-router-dom";
import { DashboardLayoutSkeleton } from '@/components/DashboardLayoutSkeleton';
import { Button } from "@/components/ui/button";
import React from "react";
import apiClient from "@/lib/apiClient"; // Import apiClient for API calls (default export).

// Sidebar link list per role (student, teacher, parent); used to render nav items
const roleNavMap: Record<string, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
  student: [
    { href: "/", label: "Home", icon: Home },
    { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/attendance", label: "Attendance", icon: BookOpen },
    { href: "/student/courses", label: "My Courses", icon: BookOpen }, // Updated to use unified LMS route
    { href: "/student/assignments", label: "Assignments", icon: GraduationCap },
    { href: "/student/grades", label: "Grades", icon: GraduationCap },
  ],
  admin: [
    { href: "/", label: "Home", icon: Home },
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }, // Admin dashboard with Current Class Widget
    { href: "/admin/courses", label: "Subjects", icon: BookOpen },
    { href: "/admin/classes", label: "Classes", icon: BookOpen },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/grades", label: "Grades", icon: GraduationCap },
    { href: "/admin/attendance", label: "Attendance", icon: Calendar }, // Admin attendance management
    { href: "/admin/timetable", label: "Timetable", icon: CalendarIcon }, // Admin timetable customization
  ],
  teacher: [
    { href: "/", label: "Home", icon: Home },
    { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/classes", label: "Classes", icon: BookOpen },
    { href: "/teacher/assignments", label: "Assignments", icon: GraduationCap },
    { href: "/teacher/gradebook", label: "Gradebook", icon: GraduationCap },
  ],
  parent: [
    { href: "/", label: "Home", icon: Home },
    { href: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/parent/grades", label: "Grades", icon: GraduationCap },
  ],
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

// Define props type for Layout component to accept optional children
type LayoutProps = {
  children?: React.ReactNode;
};

// Layout component now accepts children prop for flexible usage
export default function Layout({ children }: LayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, isAuthenticated, logout, updateUser } = useAuth(); // Destructure updateUser for profile updates.
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Default to student nav if role missing
  const role = user?.role || "student";
  const menuItems = roleNavMap[role] || roleNavMap.student;


  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              navigate("/login");
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  // Render the SidebarProvider with DashboardLayoutContent, passing children for nested rendering
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth} menuItems={menuItems} user={user} logout={logout} updateUser={updateUser} children={children} />
    </SidebarProvider>
  );
}

// Props type for DashboardLayoutContent, now includes optional children
type DashboardLayoutContentProps = {
  setSidebarWidth: (width: number) => void;
  menuItems: { href: string; label: string; icon: typeof LayoutDashboard }[];
  user: any; // TODO: type this properly
  logout: () => void;
  updateUser: (updates: Partial<{ 
    id: string; 
    name: string; 
    phone?: string; 
    email?: string; 
    role?: string; 
    semester?: number; 
    department?: string;
    // Profile fields from user_profiles table
    address?: string;
    date_of_birth?: string;
    bio?: string;
    profile_picture_url?: string;
  }>) => void; // Function to update user state
  children?: React.ReactNode; // Optional children to render instead of Outlet
};

// DashboardLayoutContent renders the sidebar and main content area
function DashboardLayoutContent({
  setSidebarWidth,
  menuItems,
  user,
  logout,
  updateUser, // Destructure updateUser from props
  children, // Destructure children from props
}: DashboardLayoutContentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.href === location.pathname);
  const isMobile = useIsMobile();

  // Profile Settings modal state - Account Info fields
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Control dialog open state
  const [editName, setEditName] = useState(""); // Editable name field
  const [editEmail, setEditEmail] = useState(""); // Editable email field
  const [editPhone, setEditPhone] = useState(""); // Editable phone field
  
  // Profile Settings modal state - Personal Info fields
  const [editAddress, setEditAddress] = useState(""); // Editable address field
  const [editDateOfBirth, setEditDateOfBirth] = useState(""); // Editable date of birth field
  const [editBio, setEditBio] = useState(""); // Editable bio field
  const [editProfilePictureUrl, setEditProfilePictureUrl] = useState(""); // Editable profile picture URL field
  
  const [isSaving, setIsSaving] = useState(false); // Loading state for save button
  const [saveError, setSaveError] = useState<string | null>(null); // Error message from API
  
  // DIRTY-STATE TRACKING: Store initial form state when modal opens
  // Used to determine which fields have changed (true PATCH semantics)
  const [initialFormState, setInitialFormState] = useState<{
    name: string;
    email: string;
    phone: string;
    address: string;
    date_of_birth: string;
    bio: string;
    profile_picture_url: string;
  } | null>(null);

  // Sync edit fields when dialog opens or user changes
  useEffect(() => {
    if (isDialogOpen && user) {
      // Capture initial state for dirty tracking (TRUE PATCH semantics)
      const initialState = {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        date_of_birth: user.date_of_birth || "",
        bio: user.bio || "",
        profile_picture_url: user.profile_picture_url || "",
      };
      
      // Set edit fields from current user state
      setEditName(initialState.name);
      setEditEmail(initialState.email);
      setEditPhone(initialState.phone);
      setEditAddress(initialState.address);
      setEditDateOfBirth(initialState.date_of_birth);
      setEditBio(initialState.bio);
      setEditProfilePictureUrl(initialState.profile_picture_url);
      
      // Store initial state for dirty comparison
      setInitialFormState(initialState);
      
      setSaveError(null); // Clear any previous errors
    }
  }, [isDialogOpen, user]);
  
  // Compute isDirty: true if any field differs from initial state
  const isDirty = initialFormState && (
    editName !== initialFormState.name ||
    editEmail !== initialFormState.email ||
    editPhone !== initialFormState.phone ||
    editAddress !== initialFormState.address ||
    editDateOfBirth !== initialFormState.date_of_birth ||
    editBio !== initialFormState.bio ||
    editProfilePictureUrl !== initialFormState.profile_picture_url
  );

  // Handle saving profile changes to API and updating local state
  // TRUE PATCH SEMANTICS: Only send fields that have changed
  // Uses form submit pattern for better UX (Enter key support)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
    
    // TRUE PATCH: Check if there are any changes before making API call
    if (!isDirty) {
      setSaveError('No changes to save.'); // Inform user nothing changed
      return; // Abort - no API call needed
    }
    
    // Build payload dynamically - ONLY include changed fields (TRUE PATCH semantics)
    const payload: Record<string, string> = {};
    
    // Only include fields that differ from initial state
    if (editName !== initialFormState?.name) {
      // Name validation: cannot be empty if included
      if (!editName.trim()) {
        setSaveError('Name cannot be empty.');
        return;
      }
      payload.name = editName.trim();
    }
    
    if (editEmail !== initialFormState?.email) {
      // Email validation: format check if included
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!editEmail.trim()) {
        setSaveError('Email cannot be empty.');
        return;
      }
      if (!emailRegex.test(editEmail.trim())) {
        setSaveError('Invalid email format.');
        return;
      }
      payload.email = editEmail.trim().toLowerCase();
    }
    
    if (editPhone !== initialFormState?.phone) {
      // Phone validation: if non-empty, must be valid format
      if (editPhone.trim().length > 0) {
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(editPhone.trim())) {
          setSaveError('Invalid phone format. Use digits, spaces, dashes, parentheses, or plus sign.');
          return;
        }
      }
      // Include phone even if empty (means "clear the field")
      payload.phone = editPhone.trim();
    }
    
    if (editAddress !== initialFormState?.address) {
      payload.address = editAddress.trim(); // Empty string = clear field
    }
    
    if (editDateOfBirth !== initialFormState?.date_of_birth) {
      // Date validation: if non-empty, must be YYYY-MM-DD
      if (editDateOfBirth.trim().length > 0) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(editDateOfBirth.trim())) {
          setSaveError('Invalid date format. Use YYYY-MM-DD.');
          return;
        }
      }
      payload.date_of_birth = editDateOfBirth.trim(); // Empty string = clear field
    }
    
    if (editBio !== initialFormState?.bio) {
      payload.bio = editBio.trim(); // Empty string = clear field
    }
    
    if (editProfilePictureUrl !== initialFormState?.profile_picture_url) {
      // URL validation: if non-empty, must be valid URL
      if (editProfilePictureUrl.trim().length > 0) {
        try {
          new URL(editProfilePictureUrl.trim());
        } catch {
          setSaveError('Invalid profile picture URL.');
          return;
        }
      }
      payload.profile_picture_url = editProfilePictureUrl.trim(); // Empty string = clear field
    }
    
    // Double-check we have something to send (should not happen due to isDirty check above)
    if (Object.keys(payload).length === 0) {
      setSaveError('No changes to save.');
      return;
    }
    
    setIsSaving(true); // Show loading state
    setSaveError(null); // Clear previous errors
    
    // Debug log: show exactly what we're sending (TRUE PATCH payload)
    console.log('PATCH /api/v1/auth/me payload:', payload);

    try {
      // Call the PATCH /api/v1/auth/me endpoint with ONLY changed fields
      const response = await apiClient.patch('/v1/auth/me', payload);
      
      // Debug log: show server response
      console.log('PATCH response:', response.data);

      // Update React state from SERVER RESPONSE (not optimistic update)
      // This ensures UI reflects actual persisted state (including NULL clears)
      if (response.data?.user) {
        updateUser({
          name: response.data.user.name,
          email: response.data.user.email,
          phone: response.data.user.phone,
          address: response.data.user.address,
          date_of_birth: response.data.user.date_of_birth,
          bio: response.data.user.bio,
          profile_picture_url: response.data.user.profile_picture_url,
        });
      }

      // Close dialog on success
      setIsDialogOpen(false);
    } catch (error: any) {
      // Extract error message from API response
      const message = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to save profile';
      console.error('Profile save failed:', error); // Log full error for debugging
      setSaveError(message); // Show error to user
    } finally {
      setIsSaving(false); // Clear loading state
    }
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

    // Highlight current nav item: exact match for dashboard links, prefix match for others
  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/student/dashboard" || href === "/teacher/dashboard" || href === "/parent/dashboard") {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };


  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    Navigation
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const itemIsActive = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={itemIsActive}
                      onClick={() => navigate(item.href)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${itemIsActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            {/* Profile Settings dialog with edit functionality */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/70 active:bg-accent transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-center">Profile Settings</DialogTitle>
                  <DialogDescription className="text-center">Update your personal information and account settings.</DialogDescription>
                </DialogHeader>
                {/* Profile content wrapped in form for Enter key support */}
                <form onSubmit={handleSaveProfile}>
                  <div className="flex flex-col items-center gap-4 py-4">
                    {/* Large avatar with initials */}
                    <Avatar className="h-20 w-20 border-2">
                      <AvatarFallback className="text-2xl font-medium bg-primary/10 text-primary">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Editable form section */}
                    <div className="w-full space-y-6">
                    {/* ===== ACCOUNT INFO SECTION ===== */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">Account Info</h3>
                      
                      {/* Name field - editable */}
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                        <Input
                          id="name"
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Enter your name"
                          className="w-full"
                          disabled={isSaving}
                        />
                      </div>
                      
                      {/* Email field - editable */}
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="w-full"
                          disabled={isSaving}
                        />
                      </div>
                      
                      {/* Phone field - editable */}
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="Enter your phone number"
                          className="w-full"
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    {/* ===== PERSONAL INFO SECTION ===== */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">Personal Info</h3>
                      
                      {/* Date of Birth field - editable */}
                      <div className="space-y-2">
                        <Label htmlFor="date_of_birth" className="text-sm font-medium">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={editDateOfBirth}
                          onChange={(e) => setEditDateOfBirth(e.target.value)}
                          className="w-full"
                          disabled={isSaving}
                        />
                      </div>
                      
                      {/* Address field - editable */}
                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                        <Input
                          id="address"
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          placeholder="Enter your address"
                          className="w-full"
                          disabled={isSaving}
                        />
                      </div>
                      
                      {/* Bio field - editable */}
                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                        <Input
                          id="bio"
                          type="text"
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          placeholder="Tell us about yourself"
                          className="w-full"
                          disabled={isSaving}
                        />
                      </div>
                      
                      {/* Profile Picture URL field - editable */}
                      <div className="space-y-2">
                        <Label htmlFor="profile_picture_url" className="text-sm font-medium">Profile Picture URL</Label>
                        <Input
                          id="profile_picture_url"
                          type="url"
                          value={editProfilePictureUrl}
                          onChange={(e) => setEditProfilePictureUrl(e.target.value)}
                          placeholder="https://example.com/your-photo.jpg"
                          className="w-full"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    
                    {/* ===== READ-ONLY FIELDS SECTION ===== */}
                    <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Institution Data (Read-Only)</h3>
                      
                      {/* Role row - read only */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Role</span>
                        <span className="text-sm font-medium capitalize">{user?.role || "-"}</span>
                      </div>
                      
                      {/* Admission number row - read only, only for students */}
                      {user?.role === "student" && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Admission No</span>
                          <span className="text-sm font-medium font-mono">
                            {localStorage.getItem("admissionNo") || "-"}
                          </span>
                        </div>
                      )}
                      
                      {/* Department row - read only, if available */}
                      {user?.department && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Department</span>
                          <span className="text-sm font-medium">{user.department}</span>
                        </div>
                      )}
                      
                      {/* Semester row - read only, if available */}
                      {user?.semester && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Semester</span>
                          <span className="text-sm font-medium">{user.semester}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Error message display */}
                    {saveError && (
                      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                        {saveError}
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="w-full space-y-2">
                    {/* Save button - disabled when no changes or request in progress (TRUE PATCH semantics) */}
                    <Button
                      type="submit"
                      variant="default"
                      className="w-full"
                      disabled={!isDirty || isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    
                    {/* Sign out button */}
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        logout(); // Clear auth state.
                        navigate("/login"); // Redirect to login page.
                      }}
                      disabled={isSaving}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  </div>
                </div>
                </form>
              </DialogContent>
            </Dialog>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Render children if provided, otherwise use Outlet for nested routes */}
        <main className="flex-1 p-4">{children ?? <Outlet />}</main>
      </SidebarInset>
    </>
  );
}
