/**
 * TeacherDashboard.tsx - Teacher landing page with Current Class Widget
 * Displays the current class context based on live clock and timetables.
 * Provides quick access to mark attendance for the active class.
 */
import React, { useEffect, useState } from 'react'; // React hooks for state and side effects
import { useNavigate } from 'react-router-dom'; // Navigation hook for routing
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Card components for layout
import { Button } from '@/components/ui/button'; // Button component for actions
import { Badge } from '@/components/ui/badge'; // Badge for status display
import { Calendar, Clock, BookOpen, Users, AlertCircle, CheckCircle } from 'lucide-react'; // Icons for visual elements
import apiClient from '@/lib/apiClient'; // API client for backend calls
import { useAuth } from '@/hooks/useAuth'; // Auth hook for user context

/**
 * Response type for /attendance/current-context endpoint
 * Updated to support multiple active classes (parallel classes)
 */
interface CurrentContextResponse {
  isActive: boolean; // Whether teacher has any active classes
  message?: string; // Explanation when inactive
  activeClasses?: Array<{
    department: string; // Department code (CT, EC, MECH)
    semester: number; // Semester number (1-6)
    courseId: number; // Resolved course ID
    courseName: string; // Course name for display
    courseCode: string; // Course code for display
    periodNumber: number; // Current period (1-6)
    dayOfWeek: string; // Current day name
    subjectName: string; // Subject name from timetable
  }>;
}

/**
 * CurrentClassWidget - Displays the current active class for the teacher/admin
 * Fetches context from backend and shows prominent "Mark Attendance" button.
 * Exported for reuse in AdminDashboard.
 */
export function CurrentClassWidget() {
  const navigate = useNavigate(); // Navigation hook for routing to attendance page
  const { user } = useAuth(); // Get current user role to route appropriately
  const [loading, setLoading] = useState(true); // Loading state for API call
  const [error, setError] = useState<string | null>(null); // Error state for display
  const [context, setContext] = useState<CurrentContextResponse | null>(null); // Context data from API

  // Fetch current context on component mount
  useEffect(() => {
    const fetchContext = async () => {
      setLoading(true); // Set loading state
      setError(null); // Clear previous error

      try {
        const response = await apiClient.get<CurrentContextResponse>('/v1/attendance/current-context'); // Fixed: added /v1 prefix to match backend route
        setContext(response.data); // Store context data
      } catch (err: any) {
        console.error('Failed to fetch current context:', err); // Log error for debugging
        setError(err?.response?.data?.message || 'Failed to load current class'); // Set error message
      } finally {
        setLoading(false); // Clear loading state
      }
    };

    fetchContext(); // Execute fetch on mount

    // Refresh context every minute to keep it accurate
    const interval = setInterval(fetchContext, 60000); // 60 second refresh
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // Handle "Mark Attendance Now" button click - route based on user role
  // Accepts a specific class context for navigation (supports multiple parallel classes)
  const handleMarkAttendance = (classContext: NonNullable<CurrentContextResponse['activeClasses']>[0]) => {
    const { courseId, periodNumber, semester } = classContext; // Extract context params
    // Admin uses admin route, teacher uses teacher-specific attendance page
    const basePath = user?.role === 'admin' ? '/admin/attendance' : '/teacher/attendance';
    navigate(`${basePath}?courseId=${courseId}&period=${periodNumber}&semester=${semester}`); // Navigate with params
  };

  // Loading state - show skeleton
  if (loading) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/25">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <Clock className="h-5 w-5 animate-pulse" /> {/* Animated clock icon */}
            <span>Detecting your current class...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state - show error message
  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-5 w-5" /> {/* Error icon */}
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Inactive state - no class right now
  if (!context?.isActive) {
    return (
      <Card className="border-muted-foreground/25 bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <CheckCircle className="h-5 w-5" /> {/* Check icon for no class */}
            <span>{context?.message || 'You have no active classes right now.'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active state - show all active classes (supports parallel classes)
  const activeClasses = context.activeClasses || [];

  // If multiple classes, render as stacked cards
  if (activeClasses.length > 1) {
    return (
      <div className="space-y-4">
        {/* Header showing count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Badge variant="default" className="bg-green-600 hover:bg-green-700 animate-pulse">
            {activeClasses.length} LIVE CLASSES
          </Badge>
          <span>Multiple classes active at this time</span>
        </div>

        {/* Render each class as a card */}
        {activeClasses.map((classContext, index) => (
          <Card key={`${classContext.courseId}-${index}`} className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" /> {/* Book icon */}
                  {classContext.courseName}
                </CardTitle>
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  LIVE
                </Badge>
              </div>
              <CardDescription className="font-mono text-xs">
                {classContext.courseCode}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Class Details Grid - compact for multiple cards */}
              <div className="grid grid-cols-4 gap-2 text-center border-t border-primary/20 pt-3">
                <div>
                  <div className="text-xs text-muted-foreground">Sem</div>
                  <div className="text-lg font-semibold">{classContext.semester}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Period</div>
                  <div className="text-lg font-semibold">P{classContext.periodNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Dept</div>
                  <div className="text-lg font-semibold">{classContext.department}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Day</div>
                  <div className="text-sm font-medium">{classContext.dayOfWeek}</div>
                </div>
              </div>

              {/* Mark Attendance Button - per card */}
              <Button
                onClick={() => handleMarkAttendance(classContext)}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                Mark Attendance for {classContext.subjectName}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Single class - original layout (unchanged for backward compatibility)
  const classContext = activeClasses[0];

  return (
    <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> {/* Book icon */}
            Current Class
          </CardTitle>
          <Badge variant="default" className="bg-green-600 hover:bg-green-700 animate-pulse">
            LIVE
          </Badge>
        </div>
        <CardDescription>
          Based on the current time and your timetable
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Course Name - Massive Display */}
        <div className="text-center py-4">
          <h2 className="text-3xl font-bold text-primary mb-2">
            {classContext.courseName}
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            {classContext.courseCode}
          </p>
        </div>

        {/* Class Details Grid */}
        <div className="grid grid-cols-3 gap-4 text-center border-t border-primary/20 pt-4">
          <div>
            <div className="text-sm text-muted-foreground">Semester</div>
            <div className="text-xl font-semibold">{classContext.semester}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Period</div>
            <div className="text-xl font-semibold">P{classContext.periodNumber}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Department</div>
            <div className="text-xl font-semibold">{classContext.department}</div>
          </div>
        </div>

        {/* Day and Subject Info */}
        <div className="flex justify-between items-center text-sm text-muted-foreground border-t border-primary/20 pt-4">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" /> {/* Calendar icon */}
            {classContext.dayOfWeek}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" /> {/* Users icon */}
            {classContext.subjectName}
          </span>
        </div>

        {/* Mark Attendance Button - Primary CTA */}
        <Button
          onClick={() => handleMarkAttendance(classContext)}
          className="w-full h-14 text-lg font-semibold mt-4"
          size="lg"
        >
          Mark Attendance Now
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * TeacherDashboard - Main dashboard for teacher users
 * Shows current class widget and quick links.
 */
export default function TeacherDashboard() {
  const { user } = useAuth(); // Get current user from auth context

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || 'Teacher'}!
          </p>
        </div>
      </div>

      {/* Current Class Widget - Main Feature */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" /> {/* Clock icon */}
          Your Current Class
        </h2>
        <CurrentClassWidget />
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = user?.role === 'admin' ? '/admin/attendance' : '/teacher/attendance'}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Attendance</h3>
                <p className="text-sm text-muted-foreground">Mark and manage attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/teacher/classes'}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">My Classes</h3>
                <p className="text-sm text-muted-foreground">View assigned classes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/teacher/gradebook'}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">Gradebook</h3>
                <p className="text-sm text-muted-foreground">Manage student grades</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}