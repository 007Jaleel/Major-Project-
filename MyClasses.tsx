import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback for memoized fetch function
import { useNavigate } from 'react-router-dom'; // Import useNavigate for routing
import apiClient from '@/lib/apiClient'; // Use apiClient which attaches Bearer token automatically
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth for authentication check

// Interface defining the structure of a Class object returned from API
// Matches the backend query: classes joined with enrollments for the student
interface Class {
  id: number; // Unique identifier for the class
  code: string; // Class code (e.g., CS101)
  name: string; // Class name (e.g., Intro to CS)
  semester: number; // Semester number (1-6)
  department: string; // Department name
  teacher_id?: number | null; // Teacher's user ID if assigned
  teacher_name: string; // Teacher's name or 'TBD'
  schedule: string; // Class schedule
  room: string; // Room assignment
  created_by?: number; // User ID who created the class
  created_at?: string; // Timestamp when class was created
}

export default function MyClasses() {
  // Get authentication status from useAuth hook
  const { isAuthenticated } = useAuth();
  // Get navigate function for routing
  const navigate = useNavigate();
  // State to store the list of classes
  const [classes, setClasses] = useState<Class[]>([]);
  // State to track loading status
  const [loading, setLoading] = useState<boolean>(false);
  // State to store error messages
  const [error, setError] = useState<string>('');

  /**
   * Handle navigation to view subjects for a class
   * @param classId - The class ID to view subjects for
   */
  const handleViewSubjects = (classId: number) => {
    // Navigate to the subjects page for this class
    navigate(`/student/courses/${classId}`);
  };

  /**
   * Handle navigation to view details for a class
   * @param classId - The class ID to view details for
   */
  const handleViewDetails = (classId: number) => {
    // Navigate to the class detail page
    navigate(`/student/courses/${classId}`);
  };

  /**
   * Handle navigation to view study materials for a class
   * @param classId - The class ID to view materials for
   */
  const handleViewMaterials = (classId: number) => {
    // Navigate to the materials page for this class
    navigate(`/student/courses/${classId}`);
  };

  // Fetch classes from the API using the student's my-classes endpoint
  // FIXED: Use /api/v1/classes/student/my-classes which gets semester/department from backend based on JWT token
  const fetchClasses = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      setError('Please log in to view your classes.');
      return;
    }

    setLoading(true); // Set loading state before API call
    setError(''); // Clear any previous errors
    try {
      // Use apiClient which automatically attaches the Bearer token from localStorage
      // The backend will extract user ID from token and get student's semester/department
      const response = await apiClient.get<Class[]>('/v1/classes/student/my-classes');
      setClasses(response.data); // Store the fetched classes
    } catch (err) {
      // Log and display error if API call fails
      console.error('Failed to fetch classes:', err);
      setError('Failed to load your classes. Please try again later.');
      setClasses([]); // Clear classes on error
    } finally {
      setLoading(false); // Clear loading state after API call completes
    }
  }, [isAuthenticated]); // Re-run when authentication status changes

  // Effect to fetch classes when component mounts or auth status changes
  useEffect(() => {
    // Only fetch if authenticated - no need for user.semester/user.department
    if (isAuthenticated) {
      fetchClasses();
    }
  }, [isAuthenticated, fetchClasses]); // Dependencies: auth status and fetch function

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Classes</h1>
      <p className="text-muted-foreground">Here are the classes for your semester and department.</p>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled Classes</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          {loading && !classes.length ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No classes found. You are not enrolled in any classes yet.</TableCell>
                  </TableRow>
                ) : (
                  classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.code}</TableCell>
                      <TableCell>{cls.name}</TableCell>
                      <TableCell>{cls.semester}</TableCell>
                      <TableCell>{cls.department}</TableCell>
                      <TableCell>{cls.teacher_name}</TableCell>
                      <TableCell>{cls.schedule}</TableCell>
                      <TableCell>{cls.room}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMaterials(cls.id)}
                        >
                          Study Materials
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSubjects(cls.id)}
                        >
                          View Subjects
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewDetails(cls.id)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
