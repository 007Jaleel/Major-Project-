/**
 * TeacherAttendance.tsx - Teacher attendance marking page with URL parameter hydration
 *
 * Features:
 * - Reads URL params (courseId, semester, department, period) on mount
 * - Auto-opens bulk mark dialog and loads student roster if courseId present
 * - Supports period_number persistence in bulk save
 * - Provides manual filter controls for non-context access
 */

import React, { useEffect, useState, useCallback } from "react"; // React hooks for state and side effects
import { useSearchParams, useNavigate } from "react-router-dom"; // URL params and navigation
import apiClient from "@/lib/apiClient"; // API client for backend calls
import { Button } from "@/components/ui/button"; // Button component
import { Input } from "@/components/ui/input"; // Input component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Card components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Select components for dropdowns
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Dialog components for modal
import { Label } from "@/components/ui/label"; // Label for form fields
import { Calendar, Users, AlertCircle, CheckCircle } from "lucide-react"; // Icons
import { toast } from "sonner"; // Toast notifications

// Attendance status type matching backend
type AttendanceStatus = 'present' | 'absent' | 'late';

// Interface for student from API
interface Student {
  roll: string; // Student roll number
  name: string; // Student name
  admissionNo: string; // Admission number
}

// Interface for course
interface Course {
  id: number; // Course ID
  code: string; // Course code
  name: string; // Course name
}

/**
 * TeacherAttendance - Mark attendance for students with URL context support
 * Renders at /teacher/attendance route
 */
export default function TeacherAttendance() {
  const [searchParams] = useSearchParams(); // Get URL search params
  const navigate = useNavigate(); // Navigation hook

  // State for bulk mark dialog
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false); // Whether bulk dialog is open
  const [bulkCourse, setBulkCourse] = useState<string>(""); // Selected course for bulk marking
  const [bulkDate, setBulkDate] = useState<string>(""); // Selected date for bulk marking
  const [bulkPeriod, setBulkPeriod] = useState<string>(""); // Period number from URL
  const [bulkSemester, setBulkSemester] = useState<string>(""); // Semester from URL
  const [bulkStudents, setBulkStudents] = useState<Student[]>([]); // Students for bulk marking
  const [bulkAttendance, setBulkAttendance] = useState<{ [roll: string]: AttendanceStatus }>({}); // Status per student
  const [bulkLoading, setBulkLoading] = useState(false); // Loading state for fetching students
  const [bulkSaving, setBulkSaving] = useState(false); // Saving state for bulk upsert

  // State for dropdown options
  const [courses, setCourses] = useState<Course[]>([]); // List of courses for dropdown

  // State for result display
  const [saveResult, setSaveResult] = useState<{ inserted: number; updated: number } | null>(null); // Last save result

  /**
   * Fetch all courses for dropdown on mount
   */
  const fetchCourses = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: Course[] }>("/v1/admin/attendance/all-courses");
      if (res.data.success) {
        setCourses(res.data.data); // Store courses
      }
    } catch (e) {
      console.error("Failed to fetch courses:", e); // Log error
    }
  };

  /**
   * Fetch students for bulk marking based on selected course
   */
  const fetchStudentsForBulk = async (courseId: string) => {
    if (!courseId) {
      setBulkStudents([]); // Clear students if no course selected
      setBulkAttendance({}); // Clear attendance state
      return;
    }
    setBulkLoading(true); // Set loading state
    try {
      // Fetch students for this course (semester+branch inference)
      const studentsRes = await apiClient.get<{ success: boolean; data: Student[] }>(
        `/v1/attendance/students-for-course?courseId=${courseId}`
      );

      if (studentsRes.data.success) {
        setBulkStudents(studentsRes.data.data); // Store students

        // Initialize all students as "present" by default
        const initialAttendance: { [roll: string]: AttendanceStatus } = {};
        studentsRes.data.data.forEach((student) => {
          initialAttendance[student.roll] = "present"; // Default to present
        });
        setBulkAttendance(initialAttendance);
      }
    } catch (e) {
      console.error("Failed to fetch students for bulk:", e); // Log error
      toast.error("Failed to load students for the selected subject.");
    } finally {
      setBulkLoading(false); // Clear loading state
    }
  };

  /**
   * Handle bulk attendance status change for a student
   */
  const handleBulkStatusChange = (roll: string, status: AttendanceStatus) => {
    setBulkAttendance((prev) => ({
      ...prev,
      [roll]: status, // Update status for this student
    }));
  };

  /**
   * Handle bulk attendance save with period_number
   */
  const handleBulkSave = async () => {
    if (!bulkCourse || !bulkDate) {
      toast.error("Please select both subject and date.");
      return;
    }

    if (bulkStudents.length === 0) {
      toast.error("No students to mark attendance for.");
      return;
    }

    // Build records array
    const records = bulkStudents.map((student) => ({
      roll: student.roll,
      status: bulkAttendance[student.roll] || "present" as AttendanceStatus,
    }));

    setBulkSaving(true); // Set saving state
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: { inserted: number; updated: number; total: number };
      }>("/v1/attendance/bulk", {
        courseId: parseInt(bulkCourse),
        date: bulkDate,
        semester: bulkSemester ? parseInt(bulkSemester) : 1,
        periodNumber: bulkPeriod ? parseInt(bulkPeriod) : null,
        records,
      });

      if (res.data.success) {
        toast.success(res.data.message || "Attendance saved successfully."); // Show success toast
        setSaveResult(res.data.data); // Store result
        setBulkDialogOpen(false); // Close dialog
        resetBulkForm(); // Reset form
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to save attendance."); // Show error toast
    } finally {
      setBulkSaving(false); // Clear saving state
    }
  };

  /**
   * Reset bulk attendance form
   */
  const resetBulkForm = () => {
    setBulkCourse("");
    setBulkDate("");
    setBulkPeriod("");
    setBulkSemester("");
    setBulkStudents([]);
    setBulkAttendance({});
  };

  /**
   * Hydrate from URL params on mount and auto-open bulk dialog
   */
  useEffect(() => {
    fetchCourses(); // Fetch courses on mount

    // Check for URL params from dashboard context
    const courseId = searchParams.get("courseId");
    const semester = searchParams.get("semester");
    const department = searchParams.get("department");
    const period = searchParams.get("period");

    if (courseId) {
      // Hydrate state from URL params
      setBulkCourse(courseId);
      setBulkSemester(semester || "");
      setBulkPeriod(period || "");

      // Set today's date as default
      const today = new Date().toISOString().split("T")[0];
      setBulkDate(today);

      // Auto-open bulk dialog
      setBulkDialogOpen(true);

      // Fetch students for the course
      fetchStudentsForBulk(courseId);
    }
  }, [searchParams]); // Re-run when URL params change

  return (
    <div className="space-y-6"> {/* Page container */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> {/* Calendar icon */}
              Mark Attendance
            </CardTitle>
            <Button onClick={() => setBulkDialogOpen(true)} className="flex items-center gap-2">
              <Users className="h-4 w-4" /> {/* Users icon */}
              Mark Bulk Attendance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info message when arriving from dashboard */}
          {searchParams.get("courseId") && (
            <div className="p-3 rounded border border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {/* Check icon */}
              <span>
                Attendance context loaded from your current class. 
                {bulkPeriod && ` Period: ${bulkPeriod}`}
                {bulkSemester && ` | Semester: ${bulkSemester}`}
              </span>
            </div>
          )}

          {/* Save result display */}
          {saveResult && (
            <div className="p-3 rounded border border-green-200 bg-green-50 text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {/* Check icon */}
              <span>
                Attendance saved: {saveResult.inserted} new records, {saveResult.updated} updated.
              </span>
            </div>
          )}

          {/* Quick instructions */}
          <div className="text-muted-foreground text-sm">
            <p>Click "Mark Bulk Attendance" to mark attendance for all students in a subject.</p>
            <p>If you came from the dashboard, the student list is already loaded for your current class.</p>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Mark Attendance Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Mark Attendance</DialogTitle>
            <DialogDescription>
              Select a subject and date, then mark attendance for all students.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Subject Selection */}
            <div className="space-y-2">
              <Label htmlFor="bulkCourse">Subject *</Label>
              <Select 
                value={bulkCourse} 
                onValueChange={(v) => { setBulkCourse(v); fetchStudentsForBulk(v); }}
              >
                <SelectTrigger id="bulkCourse">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={String(course.id)}>
                      {course.code} - {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="bulkDate">Date *</Label>
              <Input
                id="bulkDate"
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
              />
            </div>

            {/* Period Selection (pre-filled from URL) */}
            <div className="space-y-2">
              <Label htmlFor="bulkPeriod">Period (1-6)</Label>
              <Select value={bulkPeriod} onValueChange={setBulkPeriod}>
                <SelectTrigger id="bulkPeriod">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      Period {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Students Table */}
            {bulkLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading students...</div>
            ) : bulkStudents.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Roll</th>
                      <th className="text-left p-2 font-medium">Name</th>
                      <th className="text-left p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkStudents.map((student) => (
                      <tr key={student.roll} className="border-t">
                        <td className="p-2 font-mono text-xs">{student.roll}</td>
                        <td className="p-2">{student.name}</td>
                        <td className="p-2">
                          <Select
                            value={bulkAttendance[student.roll] || "present"}
                            onValueChange={(v) => handleBulkStatusChange(student.roll, v as AttendanceStatus)}
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : bulkCourse ? (
              <div className="text-center py-4 text-muted-foreground">
                No students found for this subject.
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleBulkSave}
                disabled={bulkSaving || bulkStudents.length === 0}
                className="flex-1"
              >
                {bulkSaving ? "Saving..." : "Save Attendance"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { setBulkDialogOpen(false); resetBulkForm(); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}