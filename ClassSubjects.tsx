/**
 * ClassSubjects.tsx
 * Page component to display courses/subjects for a specific enrolled class
 * Shows the curriculum subjects from courses table matching class branch+semester
 */

import React, { useState, useEffect } from 'react'; // Import React hooks for state management
import { useParams, useNavigate } from 'react-router-dom'; // Import hooks for route params and navigation
import apiClient from '@/lib/apiClient'; // Use apiClient which attaches Bearer token automatically
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components for layout
import { Button } from "@/components/ui/button"; // Import Button component for actions
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import Table components for data display
import { Loader2, ArrowLeft, BookOpen } from 'lucide-react'; // Import icons for loading and navigation
import { useAuth } from '@/hooks/useAuth'; // Import useAuth for authentication check

// Interface for Course data returned from API
interface Course {
  id: number; // Unique identifier for the course
  code: string; // Course code (e.g., "1001")
  name: string; // Course name (e.g., "Communication Skills in English")
  credits: number; // Number of credits for the course
  branch: string; // Branch/department code (e.g., "CT")
  semester: number; // Semester number (1-6)
  created_at: string; // Timestamp when course was created
}

// Interface for Class info returned from API
interface ClassInfo {
  id: number; // Unique identifier for the class
  code: string; // Class code
  name: string; // Class name
  department: string; // Department/branch name
  semester: number; // Semester number
}

// Interface for API response
interface ClassCoursesResponse {
  success: boolean; // API success flag
  class: ClassInfo; // Class information
  courses: Course[]; // Array of courses for this class
}

/**
 * ClassSubjects component - Displays courses/subjects for an enrolled class
 * Fetches courses matching the class's branch and semester from the courses table
 */
export default function ClassSubjects() {
  // Get classId from URL params
  const { classId } = useParams<{ classId: string }>();
  // Get navigation hook for routing
  const navigate = useNavigate();
  // Get authentication status from useAuth hook
  const { isAuthenticated } = useAuth();
  
  // State to store class information
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  // State to store list of courses
  const [courses, setCourses] = useState<Course[]>([]);
  // State to track loading status
  const [loading, setLoading] = useState<boolean>(true);
  // State to store error messages
  const [error, setError] = useState<string>('');

  /**
   * Fetch courses for the class from the API
   * Uses the new endpoint: GET /api/v1/classes/:classId/courses
   */
  const fetchCourses = useEffect(() => {
    // Don't fetch if not authenticated or no classId
    if (!isAuthenticated || !classId) {
      setError('Please log in to view courses.');
      setLoading(false);
      return;
    }

    // Async function to fetch courses
    const fetchClassCourses = async () => {
      setLoading(true); // Set loading state before API call
      setError(''); // Clear any previous errors
      
      try {
        // Call the new endpoint to get courses for this class
        const response = await apiClient.get<ClassCoursesResponse>(`/v1/classes/${classId}/courses`);
        
        if (response.data.success) {
          // Store class info and courses from response
          setClassInfo(response.data.class);
          setCourses(response.data.courses);
        } else {
          setError('Failed to load courses.');
        }
      } catch (err: any) {
        // Log and display error if API call fails
        console.error('Failed to fetch courses:', err);
        // Check for specific error responses
        if (err.response?.status === 403) {
          setError('You are not enrolled in this class.');
        } else if (err.response?.status === 404) {
          setError('Class not found.');
        } else {
          setError('Failed to load courses. Please try again later.');
        }
        setCourses([]); // Clear courses on error
      } finally {
        setLoading(false); // Clear loading state after API call completes
      }
    };

    fetchClassCourses(); // Execute the fetch function
  }, [isAuthenticated, classId]); // Re-run when auth status or classId changes

  /**
   * Handle navigation to view materials for a course
   * @param courseId - The course ID to view materials for
   */
  const handleViewMaterials = (courseId: number) => {
    // Navigate to the materials page for this course within the class
    navigate(`/student/courses/${courseId}`);
  };

  /**
   * Handle navigation back to My Classes list
   */
  const handleBack = () => {
    navigate('/student/courses');
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading courses...</span>
      </div>
    );
  }

  // Render error state
  if (error && !classInfo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Classes
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button and class info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Classes
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Subjects / Courses</h1>
            {classInfo && (
              <p className="text-muted-foreground">
                For Class: {classInfo.code} – {classInfo.department} – Semester {classInfo.semester}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Courses table card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Curriculum Subjects ({courses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          
          {courses.length === 0 && !loading ? (
            <div className="text-center p-8 text-muted-foreground">
              No courses found for this class's branch and semester.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.code}</TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>{course.credits}</TableCell>
                    <TableCell>{course.semester}</TableCell>
                    <TableCell>{course.branch}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewMaterials(course.id)}
                      >
                        View Materials
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}