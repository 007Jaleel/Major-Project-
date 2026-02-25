/**
 * AdminCourses.tsx
 *
 * Admin screen to manage subjects (courses) with semester + branch mapping.
 * Uses backend endpoints:
 *  - GET    /api/v1/courses?branch=CT&semester=1
 *  - POST   /api/v1/courses (auto-syncs to classes table)
 *  - PUT    /api/v1/courses/:id (syncs changes to classes table)
 *  - DELETE /api/v1/courses/:id (deletes corresponding class)
 * 
 * When a course is created, a corresponding class entry is automatically created
 * with matching code, name, semester, and department fields.
 */

import React, { useEffect, useMemo, useState } from "react"; // Import React hooks for state and effects.
import { useNavigate } from "react-router-dom"; // Import navigation hook
import apiClient from "@/lib/apiClient"; // Import axios for API calls.
import { Button } from "@/components/ui/button"; // Import shared Button component.
import { Input } from "@/components/ui/input"; // Import shared Input component.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card UI components.
import { Settings } from "lucide-react"; // Import settings icon for Manage Materials button

type Course = { // Define the course/subject shape used by this page.
  id: number; // Unique course id.
  code: string; // Subject code.
  name: string; // Subject name.
  credits: number; // Credits.
  branch: "CT" | "EC" | "MECH"; // Branch.
  semester: number; // Semester (1..6).
  created_at: string; // Created timestamp.
};

export default function AdminCourses() { // Export admin course manager component.
  const navigate = useNavigate(); // Navigation hook for routing
  const [branch, setBranch] = useState<"CT" | "EC" | "MECH" | "">(""); // Hold branch filter.
  const [semester, setSemester] = useState<number | "">(""); // Hold semester filter.
  const [courses, setCourses] = useState<Course[]>([]); // Hold fetched courses.
  const [loading, setLoading] = useState(false); // Track loading state.
  const [error, setError] = useState<string>(""); // Track error message.

  const [newCode, setNewCode] = useState(""); // Track new course code input.
  const [newName, setNewName] = useState(""); // Track new course name input.
  const [newCredits, setNewCredits] = useState(3.0); // Track new course credits input.
  const [newBranch, setNewBranch] = useState<"CT" | "EC" | "MECH">("CT"); // Track new course branch.
  const [newSemester, setNewSemester] = useState<number>(1); // Track new course semester.

  const queryParams = useMemo(() => { // Build query params based on selected filters.
    const params: Record<string, any> = {}; // Create a params object.
    if (branch) params.branch = branch; // Add branch filter.
    if (semester) params.semester = semester; // Add semester filter.
    return params; // Return params.
  }, [branch, semester]);

  const fetchCourses = async () => { // Define function to fetch course list.
    setLoading(true); // Set loading true.
    setError(""); // Clear any existing error.
    
    // Check if user is authenticated before making API call
    const token = localStorage.getItem('authToken'); // Get auth token from localStorage
    if (!token) {
      setError('Authentication required. Please log in to view subjects.'); // Set authentication error
      setLoading(false); // Set loading false
      setCourses([]); // Clear courses
      return; // Exit early if no token
    }
    
    try {
      const res = await apiClient.get<Course[]>("/v1/courses", { params: queryParams }); // Call backend list endpoint at /api/v1/courses.
      setCourses(res.data); // Store fetched courses.
    } catch (e: any) {
      // Check for authentication errors
      if (e?.response?.status === 401 || e?.response?.data?.message?.includes('token')) {
        setError('Authentication failed. Please log in again to view subjects.'); // Set auth error message
      } else {
        setError(e?.response?.data?.error || "Failed to load courses"); // Set error message.
      }
    } finally {
      setLoading(false); // Set loading false.
    }
  }; 

  useEffect(() => { // Fetch courses when filters change.
    fetchCourses(); // Trigger fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, semester]);

  const handleCreate = async () => { // Create a new course (auto-syncs to classes table).
    setError(""); // Clear error.
    setLoading(true); // Set loading.
    try {
      await apiClient.post("/v1/courses", { // Call create endpoint at /api/v1/courses.
        code: newCode, // Send code.
        name: newName, // Send name.
        credits: newCredits, // Send credits.
        branch: newBranch, // Send branch.
        semester: newSemester, // Send semester.
      });
      setNewCode(""); // Reset code input.
      setNewName(""); // Reset name input.
      setNewCredits(3.0); // Reset credits input.
      setNewBranch("CT"); // Reset branch.
      setNewSemester(1); // Reset semester.
      await fetchCourses(); // Refresh list.
      
      // Dispatch custom event to notify other components (e.g., AdminClasses) that subjects have been updated
      window.dispatchEvent(new Event('subjectsUpdated')); // Notify other pages to refresh
      console.log('Dispatched subjectsUpdated event after creating course'); // Log for debugging
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to create course"); // Set error.
    } finally {
      setLoading(false); // Clear loading.
    }
  }; 

  const handleDelete = async (id: number) => { // Delete an existing course (also deletes corresponding class).
    if (!confirm("Delete this subject? This will also delete the corresponding class entry.")) return; // Ask confirmation.
    setError(""); // Clear error.
    setLoading(true); // Set loading.
    try {
      await apiClient.delete(`/v1/courses/${id}`); // Call delete endpoint at /api/v1/courses.
      await fetchCourses(); // Refresh list.
      
      // Dispatch custom event to notify other components that subjects have been updated
      window.dispatchEvent(new Event('subjectsUpdated')); // Notify other pages to refresh
      console.log('Dispatched subjectsUpdated event after deleting course'); // Log for debugging
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to delete course"); // Set error.
    } finally {
      setLoading(false); // Clear loading.
    }
  }; 

  const handleQuickUpdate = async (course: Course, patch: Partial<Course>) => { // Update a course field quickly (syncs to classes table).
    setError(""); // Clear error.
    setLoading(true); // Set loading.
    try {
      await apiClient.put(`/api/v1/courses/${course.id}`, patch); // Call update endpoint at /api/v1/courses.
      await fetchCourses(); // Refresh list.
      
      // Dispatch custom event to notify other components that subjects have been updated
      window.dispatchEvent(new Event('subjectsUpdated')); // Notify other pages to refresh
      console.log('Dispatched subjectsUpdated event after updating course'); // Log for debugging
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to update course"); // Set error.
    } finally {
      setLoading(false); // Clear loading.
    }
  }; 

  // Navigate to the Class Editor for managing lessons and materials
  const handleManageMaterials = async (course: Course) => {
    try {
      // Find the corresponding class for this course (by code matching)
      const res = await apiClient.get(`/v1/classes?code=${course.code}`); // Find class by course code
      if (res.data && res.data.length > 0) {
        const classId = res.data[0].id; // Get the class ID
        navigate(`/admin/classes/${classId}/editor`); // Navigate to editor
      } else {
        // If no class found, try to get class by matching name/semester/department
        const altRes = await apiClient.get(`/v1/classes`); // Get all classes
        const matchingClass = altRes.data.find((cls: any) => 
          cls.code === course.code || // Match by code
          (cls.name === course.name && cls.semester === course.semester) // Or match by name + semester
        );
        if (matchingClass) {
          navigate(`/admin/classes/${matchingClass.id}/editor`); // Navigate to editor
        } else {
          alert('No corresponding class found for this course. Please ensure the class exists.'); // Show error
        }
      }
    } catch (error) {
      console.error('Error finding class:', error); // Log error
      alert('Failed to find the class for this course.'); // Show error
    }
  };

  return ( // Render UI.
    <div className="space-y-6"> {/* Wrap content with spacing. */}
      <Card> {/* Filters card. */}
          <CardHeader> {/* Card header. */}
            <CardTitle>Manage Subjects (Courses)</CardTitle> {/* Title. */}
          </CardHeader>
          <CardContent className="space-y-4"> {/* Card content. */}
            {error && (
              <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700">{error}</div> // Show error.
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Filters grid. */}
              <div className="space-y-2"> {/* Branch filter container. */}
                <label className="text-sm font-medium">Filter by Branch</label> {/* Branch label. */}
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" // Select styling.
                  value={branch} // Bind selected branch.
                  onChange={(e) => setBranch(e.target.value as any)} // Update branch state.
                >
                  <option value="">All</option> {/* All option. */}
                  <option value="CT">CT</option> {/* CT option. */}
                  <option value="EC">EC</option> {/* EC option. */}
                  <option value="MECH">MECH</option> {/* MECH option. */}
                </select>
              </div>
              <div className="space-y-2"> {/* Semester filter container. */}
                <label className="text-sm font-medium">Filter by Semester</label> {/* Semester label. */}
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" // Select styling.
                  value={semester} // Bind selected semester.
                  onChange={(e) => setSemester(e.target.value ? Number(e.target.value) : "")} // Update semester state.
                >
                  <option value="">All</option> {/* All option. */}
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <option key={s} value={s}>{`Semester ${s}`}</option> // Semester options.
                  ))}
                </select>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3"> {/* Create form container. */}
              <div className="font-semibold">Add New Subject</div> {/* Section title. */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3"> {/* Form grid. */}
                <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Code (e.g. CT101)" /> {/* Code input. */}
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" /> {/* Name input. */}
                <Input
                  type="number"
                  step="0.5"
                  value={newCredits}
                  onChange={(e) => setNewCredits(parseFloat(e.target.value))}
                  placeholder="Credits"
                />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm" // Select styling.
                  value={newBranch} // Bind branch.
                  onChange={(e) => setNewBranch(e.target.value as any)} // Update branch.
                >
                  <option value="CT">CT</option> {/* CT option. */}
                  <option value="EC">EC</option> {/* EC option. */}
                  <option value="MECH">MECH</option> {/* MECH option. */}
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm" // Select styling.
                  value={newSemester} // Bind semester.
                  onChange={(e) => setNewSemester(Number(e.target.value))} // Update semester.
                >
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <option key={s} value={s}>{`Sem ${s}`}</option> // Semester options.
                  ))}
                </select>
              </div>
              <Button onClick={handleCreate} disabled={loading || !newCode.trim() || !newName.trim()}> {/* Create button. */}
                {loading ? "Saving..." : "Create Subject"} {/* Button label. */}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Card grid container */}
              {loading ? (
                <div className="p-4 text-center text-muted-foreground col-span-full">Loading...</div>
              ) : courses.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground col-span-full">No subjects found</div>
              ) : (
                courses.map((c) => (
                  <div key={c.id} className="subject-card card-elegant space-y-2 p-4 rounded-lg"> {/* Course card */}
                    <div className="subject-name">{c.name}</div>
                    <div className="subject-meta">
                      <span>{c.code}</span>
                      <span>Sem {c.semester}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2"> {/* Actions cell */}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleManageMaterials(c); }}
                        disabled={loading}
                        className="flex items-center gap-1"
                      >
                        <Settings className="w-4 h-4" /> Manage Materials
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const name = prompt("New name", c.name);
                          if (name != null && name.trim()) handleQuickUpdate(c, { name });
                        }}
                        disabled={loading}
                      >
                        Rename
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
