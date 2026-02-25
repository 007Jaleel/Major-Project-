/**
 * StudentDashboard.tsx
 *
 * Student dashboard that displays classes filtered by the student's semester and branch.
 * Uses backend endpoint: GET /api/v1/classes/student/my-classes
 * 
 * The backend automatically filters classes based on the student's profile:
 * - current_semester: Student's current semester (1-6)
 * - branch: Student's department (CT, EC, MECH)
 */

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, AlertCircle, CheckCircle, FileText, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { mockStudentAssignments, mockStudentGrades } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";

// Type for class data returned from /api/v1/classes/student/my-classes
interface StudentClass {
  id: number; // Class ID
  code: string; // Class code (e.g., "CT101")
  name: string; // Class name (e.g., "Introduction to Computer Science")
  semester: number; // Semester (1-6)
  department: string; // Department/Branch (CT, EC, MECH)
  teacher_name: string | null; // Teacher name
  schedule: string | null; // Schedule (e.g., "Mon, Wed, Fri 10:00-11:00 AM")
  room: string | null; // Room (e.g., "A101")
}

export default function StudentDashboard() {
  const { user } = useAuth();
  
  // State for classes fetched from API (filtered by student's semester+branch)
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  
  // Mocked data for assignments and grades (to be replaced with API calls later)
  const [assignments, setAssignments] = useState(mockStudentAssignments);
  const [grades, setGrades] = useState(mockStudentGrades);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);

  // Fetch classes filtered by student's semester and branch
  const fetchMyClasses = async () => {
    setClassesLoading(true); // Set loading state
    setClassesError(null); // Clear any previous error
    
    // Note: Authentication is handled automatically by apiClient's request interceptor
    // which attaches the Bearer token from localStorage for every request.
    // 401 errors from the server will be caught in the catch block below.
    
    try {
      // Call the new endpoint that filters by student's semester and branch
      const response = await apiClient.get<StudentClass[]>('/v1/classes/student/my-classes');
      setClasses(response.data); // Store fetched classes
      console.log(`Fetched ${response.data.length} classes for student`); // Log for debugging
    } catch (err: any) {
      console.error('Failed to fetch student classes:', err); // Log error to console
      
      // Check for authentication errors
      if (err?.response?.status === 401 || err?.response?.data?.message?.includes('token')) {
        setClassesError('Authentication failed. Please log in again to view your classes.'); // Set auth error message
      } else {
        setClassesError(err?.response?.data?.message || 'Failed to fetch your classes. Please try again.'); // Set generic error message
      }
      setClasses([]); // Clear classes on error
    } finally {
      setClassesLoading(false); // Set loading false
    }
  };

  // Fetch classes on component mount
  useEffect(() => {
    fetchMyClasses(); // Fetch classes when component mounts
  }, []);

  // Calculate upcoming assignments
  const upcomingAssignments = assignments?.filter((a) => new Date(a.assignment.dueDate) > new Date()).sort((a, b) => new Date(a.assignment.dueDate).getTime() - new Date(b.assignment.dueDate).getTime()).slice(0, 5) || [];

  // Calculate recent grades
  const recentGrades = grades?.slice(0, 5) || [];

  // Calculate average grade
  const averageGrade =
    recentGrades.length > 0
      ? (
          recentGrades.reduce((sum, g) => sum + (parseFloat(g.grade.score || "0") || 0), 0) /
          recentGrades.length
        ).toFixed(1)
      : "N/A";

  return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">Here's your academic overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="card-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Enrolled Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{classes?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active courses</p>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{upcomingAssignments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Due soon</p>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Grade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{averageGrade}%</div>
              <p className="text-xs text-muted-foreground mt-1">Across all classes</p>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Graded Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{recentGrades.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Feedback received</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Assignments */}
          <div className="lg:col-span-2">
            <Card className="card-elegant">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Upcoming Assignments</CardTitle>
                    <CardDescription>Tasks due in the next 14 days</CardDescription>
                  </div>
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {assignmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-muted rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : upcomingAssignments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAssignments.map((a) => (
                      <div
                        key={a.assignment.id}
                        className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{a.assignment.title}</h4>
                            <p className="text-sm text-muted-foreground">{a.class.name}</p>
                          </div>
                          <Badge variant="outline">
                            {Math.ceil(
                              (new Date(a.assignment.dueDate).getTime() - new Date().getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}{" "}
                            days
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Due: {format(new Date(a.assignment.dueDate), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                        <Button variant="outline" size="sm">
                          View & Submit
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No upcoming assignments</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Grades */}
          <div>
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle>Recent Grades</CardTitle>
                <CardDescription>Latest feedback</CardDescription>
              </CardHeader>
              <CardContent>
                {gradesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : recentGrades.length > 0 ? (
                  <div className="space-y-3">
                    {recentGrades.map((g) => (
                      <div key={g.grade.id} className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm">{g.assignment.title}</p>
                          <span className="text-lg font-bold text-blue-600">
                            {g.grade.score}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(g.grade.gradedAt || new Date()), "MMM dd")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">No grades yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Classes Overview - Filtered by Student's Semester and Branch */}
        <Card className="card-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Classes</CardTitle>
                <CardDescription>Classes for your semester and department</CardDescription>
              </div>
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {classesError && (
              <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 mb-4">
                {classesError}
              </div>
            )}
            
            {classesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : classes && classes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <h4 className="font-semibold mb-1">{c.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{c.code}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Sem {c.semester}</Badge>
                      <Badge variant="secondary">{c.department}</Badge>
                    </div>
                    {c.teacher_name && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Teacher: {c.teacher_name}
                      </p>
                    )}
                    {c.schedule && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Schedule: {c.schedule}
                      </p>
                    )}
                    {c.room && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Room: {c.room}
                      </p>
                    )}
                    <Button variant="outline" size="sm" className="w-full">
                      View Class
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No classes found for your semester and department</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Contact your administrator if this seems incorrect
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
