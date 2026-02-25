/**
 * AdminAttendance.tsx
 *
 * Admin page for managing attendance with full visibility and audit trail.
 * Supports:
 * - Viewing attendance records with filtering by semester, department, subject, student, date range
 * - Creating new attendance records (Mark Attendance)
 * - Editing attendance status
 * - Deleting attendance records (admin only)
 */

import React, { useEffect, useState, useCallback } from "react"; // Import React hooks.
import { useSearchParams } from "react-router-dom"; // Import URL params hook for hydration.
import apiClient from "@/lib/apiClient"; // Import API client for backend calls.
import { Button } from "@/components/ui/button"; // Import Button component.
import { Input } from "@/components/ui/input"; // Import Input component.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components for dropdowns.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"; // Import Dialog components for modal.
import { Label } from "@/components/ui/label"; // Import Label for form fields.
import { Plus, Pencil, Trash2, Calendar, Filter, AlertCircle, CheckCircle } from "lucide-react"; // Import icons.
import { toast } from "sonner"; // Import toast for notifications.

// Attendance status type matching backend
type AttendanceStatus = 'present' | 'absent' | 'late';

// Interface for attendance record from API
interface AttendanceRecord {
  id: number; // Attendance record ID.
  date: string; // Attendance date (YYYY-MM-DD).
  periodNumber: number; // Period number (1-6) for timetable integration.
  roll: string; // Student roll number.
  studentName: string; // Student name from students table.
  admissionNo: string; // Admission number from students table.
  department: string; // Department from students table.
  semester: number; // Semester number.
  courseId: number; // Course ID.
  courseCode: string; // Course code (e.g., 'CT101').
  courseName: string; // Course name (e.g., 'Mathematics I').
  status: AttendanceStatus; // present, absent, or late.
  markedByUserId: number | null; // User ID who created the record.
  markedByName: string | null; // Name of user who created the record.
  updatedByUserId: number | null; // User ID who last updated the record.
  updatedByName: string | null; // Name of user who last updated the record.
  createdAt: string | null; // Record creation timestamp.
  updatedAt: string | null; // Record last update timestamp.
}

// Interface for course
interface Course {
  id: number; // Course ID.
  code: string; // Course code.
  name: string; // Course name.
}

// Interface for student
interface Student {
  roll: string; // Student roll number.
  name: string; // Student name.
  admissionNo: string; // Admission number.
}

// Interface for paginated API response
interface AttendanceListResponse {
  success: boolean;
  data: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * AdminAttendance - Manage attendance with full visibility and audit trail.
 * Renders at /admin/attendance route.
 * Supports URL parameter hydration for zero-click attendance marking from dashboard.
 */
export default function AdminAttendance() {
  // URL params hook for hydration from dashboard context
  const [searchParams] = useSearchParams(); // Get URL search params for courseId, period, semester.

  // State for attendance list
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]); // Hold attendance data.
  const [loading, setLoading] = useState(false); // Track loading state.
  const [error, setError] = useState<string>(""); // Hold error message.

  // State for filters - use "__all__" sentinel for Radix Select (empty string not allowed).
  const [semesterFilter, setSemesterFilter] = useState<string>("__all__"); // Selected semester filter.
  const [departmentFilter, setDepartmentFilter] = useState<string>("__all__"); // Selected department filter.
  const [courseFilter, setCourseFilter] = useState<string>("__all__"); // Selected course filter.
  const [rollFilter, setRollFilter] = useState<string>(""); // Student roll filter.
  const [statusFilter, setStatusFilter] = useState<string>("__all__"); // Status filter.
  const [fromDateFilter, setFromDateFilter] = useState<string>(""); // From date filter.
  const [toDateFilter, setToDateFilter] = useState<string>(""); // To date filter.

  // State for pagination
  const [page, setPage] = useState(1); // Current page number.
  const [totalPages, setTotalPages] = useState(1); // Total pages available.
  const [totalCount, setTotalCount] = useState(0); // Total count of records.
  const limit = 20; // Items per page.

  // State for dropdown options
  const [departments, setDepartments] = useState<string[]>([]); // List of departments for dropdown.
  const [courses, setCourses] = useState<Course[]>([]); // List of courses for dropdown.

  // State for Mark Attendance dialog (single record - legacy)
  const [markDialogOpen, setMarkDialogOpen] = useState(false); // Whether mark dialog is open.
  const [markSemester, setMarkSemester] = useState<string>(""); // Semester for mark dialog.
  const [markDepartment, setMarkDepartment] = useState<string>(""); // Department for mark dialog.
  const [markCourse, setMarkCourse] = useState<string>(""); // Course for mark dialog.
  const [markStudent, setMarkStudent] = useState<string>(""); // Student roll for mark dialog.
  const [markDate, setMarkDate] = useState<string>(""); // Date for mark dialog.
  const [markStatus, setMarkStatus] = useState<AttendanceStatus>("present"); // Status for mark dialog.
  const [marking, setMarking] = useState(false); // Track marking in progress.
  const [students, setStudents] = useState<Student[]>([]); // Students for dropdown.
  const [markCourses, setMarkCourses] = useState<Course[]>([]); // Courses for mark dialog dropdown.

  // State for Bulk Mark Attendance dialog (new)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false); // Whether bulk dialog is open.
  const [bulkCourse, setBulkCourse] = useState<string>(""); // Selected course for bulk marking.
  const [bulkDate, setBulkDate] = useState<string>(""); // Selected date for bulk marking.
  const [bulkStudents, setBulkStudents] = useState<Student[]>([]); // Students for bulk marking.
  const [bulkAttendance, setBulkAttendance] = useState<{ [roll: string]: AttendanceStatus }>({}); // Status per student.
  const [bulkLoading, setBulkLoading] = useState(false); // Loading state for fetching students.
  const [bulkSaving, setBulkSaving] = useState(false); // Saving state for bulk upsert.

  // State for Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false); // Whether edit dialog is open.
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null); // Record being edited.
  const [editStatus, setEditStatus] = useState<AttendanceStatus>("present"); // New status value.
  const [updating, setUpdating] = useState(false); // Track update in progress.

  // State for Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false); // Whether delete dialog is open.
  const [deleteRecord, setDeleteRecord] = useState<AttendanceRecord | null>(null); // Record to delete.
  const [deleting, setDeleting] = useState(false); // Track delete in progress.

  /**
   * Fetch attendance records from API with current filters.
   */
  const fetchAttendance = useCallback(async () => {
    setLoading(true); // Set loading state.
    setError(""); // Clear previous error.
    try {
      const params = new URLSearchParams({
        page: page.toString(), // Add page number.
        limit: limit.toString(), // Add limit.
      });

      // Add optional filters - exclude "__all__" sentinel (means "no filter").
      if (semesterFilter && semesterFilter !== "__all__") params.append("semester", semesterFilter);
      if (departmentFilter && departmentFilter !== "__all__") params.append("department", departmentFilter);
      if (courseFilter && courseFilter !== "__all__") params.append("courseId", courseFilter);
      if (rollFilter) params.append("roll", rollFilter);
      if (statusFilter && statusFilter !== "__all__") params.append("status", statusFilter);
      if (fromDateFilter) params.append("fromDate", fromDateFilter);
      if (toDateFilter) params.append("toDate", toDateFilter);

      // Call API to get attendance records at /api/v1/admin/attendance
      const res = await apiClient.get<AttendanceListResponse>(
        `/v1/admin/attendance?${params.toString()}`
      );

      if (res.data.success) {
        setAttendance(res.data.data); // Store attendance records.
        setTotalPages(res.data.totalPages); // Store total pages.
        setTotalCount(res.data.total); // Store total count.
      }
    } catch (e: any) {
      // Show server error message, or generic fallback (also check .error for non-standard responses)
      const serverMsg = e?.response?.data?.message || e?.response?.data?.error;
      setError(serverMsg || "Failed to load attendance records"); // Set error message.
    } finally {
      setLoading(false); // Clear loading state.
    }
  }, [page, semesterFilter, departmentFilter, courseFilter, rollFilter, statusFilter, fromDateFilter, toDateFilter]);

  /**
   * Fetch departments for filter dropdown.
   */
  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: string[] }>("/v1/admin/attendance/departments");
      if (res.data.success) {
        setDepartments(res.data.data); // Store departments.
      }
    } catch (e) {
      console.error("Failed to fetch departments:", e); // Log error.
    }
  };

  /**
   * Fetch all courses for filter dropdown.
   */
  const fetchCourses = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: Course[] }>("/v1/admin/attendance/all-courses");
      if (res.data.success) {
        setCourses(res.data.data); // Store courses.
      }
    } catch (e) {
      console.error("Failed to fetch courses:", e); // Log error.
    }
  };

  /**
   * Fetch students for mark dialog based on semester and department.
   */
  const fetchStudentsForMark = async (semester: string, department: string) => {
    if (!semester || !department) {
      setStudents([]); // Clear students if filters incomplete.
      return;
    }
    try {
      const res = await apiClient.get<{ success: boolean; data: Student[] }>(
        `/v1/admin/attendance/students?semester=${semester}&department=${department}`
      );
      if (res.data.success) {
        setStudents(res.data.data); // Store students.
      }
    } catch (e) {
      console.error("Failed to fetch students:", e); // Log error.
      setStudents([]); // Clear on error.
    }
  };

  /**
   * Fetch courses for mark dialog based on semester and branch.
   */
  const fetchCoursesForMark = async (semester: string, branch: string) => {
    if (!semester || !branch) {
      setMarkCourses([]); // Clear courses if filters incomplete.
      return;
    }
    try {
      const res = await apiClient.get<{ success: boolean; data: Course[] }>(
        `/v1/admin/attendance/courses?semester=${semester}&branch=${branch}`
      );
      if (res.data.success) {
        setMarkCourses(res.data.data); // Store courses.
      }
    } catch (e) {
      console.error("Failed to fetch courses:", e); // Log error.
      setMarkCourses([]); // Clear on error.
    }
  };

  // Initial data fetch on mount.
  useEffect(() => {
    fetchDepartments(); // Fetch departments.
    fetchCourses(); // Fetch courses.
  }, []);

  // Fetch attendance when filters or page change.
  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Fetch students when semester/department changes in mark dialog.
  useEffect(() => {
    fetchStudentsForMark(markSemester, markDepartment);
    fetchCoursesForMark(markSemester, markDepartment);
  }, [markSemester, markDepartment]);

  /**
   * URL Parameter Hydration - Auto-open bulk dialog when arriving from dashboard.
   * Reads courseId, period, semester, department from URL and pre-fills bulk form.
   */
  useEffect(() => {
    // Check for URL params from dashboard context
    const courseId = searchParams.get("courseId");
    const period = searchParams.get("period");
    const semester = searchParams.get("semester");
    const department = searchParams.get("department");

    if (courseId) {
      // Hydrate bulk form state from URL params
      setBulkCourse(courseId); // Pre-select course.

      // Set today's date as default
      const today = new Date().toISOString().split("T")[0];
      setBulkDate(today); // Pre-fill date to today.

      // Auto-open bulk dialog
      setBulkDialogOpen(true);

      // Fetch students for the course (deferred to next tick to ensure state is set)
      setTimeout(() => {
        fetchStudentsForBulk(courseId); // Fetch student roster.
      }, 0);
    }
  }, [searchParams]); // Re-run when URL params change.

  /**
   * Handle Mark Attendance form submission.
   */
  const handleMarkAttendance = async () => {
    // Validate required fields
    if (!markStudent || !markCourse || !markDate || !markStatus || !markSemester) {
      toast.error("Please fill in all required fields");
      return;
    }

    setMarking(true); // Set marking state.
    try {
      const res = await apiClient.post<{ success: boolean; data: AttendanceRecord; message: string }>(
        "/v1/admin/attendance",
        {
          roll: markStudent,
          courseId: parseInt(markCourse),
          date: markDate,
          status: markStatus,
          semester: parseInt(markSemester),
        }
      );

      if (res.data.success) {
        toast.success("Attendance marked successfully"); // Show success toast.
        setMarkDialogOpen(false); // Close dialog.
        resetMarkForm(); // Reset form.
        fetchAttendance(); // Refresh list.
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to mark attendance"); // Show error toast.
    } finally {
      setMarking(false); // Clear marking state.
    }
  };

  /**
   * Handle Edit Attendance form submission.
   */
  const handleUpdateAttendance = async () => {
    if (!editRecord) return;

    setUpdating(true); // Set updating state.
    try {
      const res = await apiClient.put<{ success: boolean; data: AttendanceRecord; message: string }>(
        `/v1/admin/attendance/${editRecord.id}`,
        { status: editStatus }
      );

      if (res.data.success) {
        toast.success("Attendance updated successfully"); // Show success toast.
        setEditDialogOpen(false); // Close dialog.
        setEditRecord(null); // Clear edit record.
        fetchAttendance(); // Refresh list.
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update attendance"); // Show error toast.
    } finally {
      setUpdating(false); // Clear updating state.
    }
  };

  /**
   * Handle Delete Attendance.
   */
  const handleDeleteAttendance = async () => {
    if (!deleteRecord) return;

    setDeleting(true); // Set deleting state.
    try {
      const res = await apiClient.delete<{ success: boolean; message: string }>(
        `/v1/admin/attendance/${deleteRecord.id}`
      );

      if (res.data.success) {
        toast.success("Attendance record deleted successfully"); // Show success toast.
        setDeleteDialogOpen(false); // Close dialog.
        setDeleteRecord(null); // Clear delete record.
        fetchAttendance(); // Refresh list.
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to delete attendance"); // Show error toast.
    } finally {
      setDeleting(false); // Clear deleting state.
    }
  };

  /**
   * Reset mark attendance form.
   */
  const resetMarkForm = () => {
    setMarkSemester("");
    setMarkDepartment("");
    setMarkCourse("");
    setMarkStudent("");
    setMarkDate("");
    setMarkStatus("present");
    setStudents([]);
    setMarkCourses([]);
  };

  /**
   * Fetch students for bulk marking based on selected course.
   * Uses the new students-for-course endpoint with semester+branch inference.
   */
  const fetchStudentsForBulk = async (courseId: string) => {
    if (!courseId) {
      setBulkStudents([]); // Clear students if no course selected.
      setBulkAttendance({}); // Clear attendance state.
      return;
    }
    setBulkLoading(true); // Set loading state.
    try {
      // Fetch students for this course (semester+branch inference)
      const studentsRes = await apiClient.get<{ success: boolean; data: Student[] }>(
        `/v1/admin/attendance/students-for-course?courseId=${courseId}`
      );

      if (studentsRes.data.success) {
        setBulkStudents(studentsRes.data.data); // Store students.

        // Initialize all students as "present" by default
        const initialAttendance: { [roll: string]: AttendanceStatus } = {};
        studentsRes.data.data.forEach((student) => {
          initialAttendance[student.roll] = "present"; // Default to present.
        });
        setBulkAttendance(initialAttendance);
      }

      // If date is also selected, fetch existing attendance records
      if (bulkDate) {
        const attendanceRes = await apiClient.get<{ success: boolean; data: AttendanceRecord[] }>(
          `/v1/admin/attendance/by-date?courseId=${courseId}&date=${bulkDate}`
        );

        if (attendanceRes.data.success && attendanceRes.data.data.length > 0) {
          // Merge existing attendance into the state
          const existingAttendance = { ...bulkAttendance };
          attendanceRes.data.data.forEach((record) => {
            existingAttendance[record.roll] = record.status; // Override with existing status.
          });
          setBulkAttendance(existingAttendance);
        }
      }
    } catch (e) {
      console.error("Failed to fetch students for bulk:", e); // Log error.
      toast.error("Failed to load students for the selected subject.");
    } finally {
      setBulkLoading(false); // Clear loading state.
    }
  };

  /**
   * Handle bulk attendance status change for a student.
   */
  const handleBulkStatusChange = (roll: string, status: AttendanceStatus) => {
    setBulkAttendance((prev) => ({
      ...prev,
      [roll]: status, // Update status for this student.
    }));
  };

  /**
   * Handle bulk attendance save.
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

    // Find the selected course to get semester
    const selectedCourse = courses.find((c) => c.id === parseInt(bulkCourse));
    if (!selectedCourse) {
      toast.error("Selected subject not found.");
      return;
    }

    // Build records array
    const records = bulkStudents.map((student) => ({
      roll: student.roll,
      status: bulkAttendance[student.roll] || "present" as AttendanceStatus,
    }));

    setBulkSaving(true); // Set saving state.
    try {
      // Find semester from course (we need to fetch it from the courses list or infer)
      // For now, we'll get it from the first student's semester if available, or use 1 as fallback
      const semester = bulkStudents.length > 0 ? 1 : 1; // TODO: Get actual semester from course.

      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: { inserted: number; updated: number; total: number };
      }>("/v1/admin/attendance/bulk", {
        courseId: parseInt(bulkCourse),
        date: bulkDate,
        semester,
        records,
      });

      if (res.data.success) {
        toast.success(res.data.message || "Attendance saved successfully."); // Show success toast.
        setBulkDialogOpen(false); // Close dialog.
        resetBulkForm(); // Reset form.
        fetchAttendance(); // Refresh list.
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to save attendance."); // Show error toast.
    } finally {
      setBulkSaving(false); // Clear saving state.
    }
  };

  /**
   * Reset bulk attendance form.
   */
  const resetBulkForm = () => {
    setBulkCourse("");
    setBulkDate("");
    setBulkStudents([]);
    setBulkAttendance({});
  };

  /**
   * Open edit dialog with selected record.
   */
  const openEditDialog = (record: AttendanceRecord) => {
    setEditRecord(record); // Set record to edit.
    setEditStatus(record.status); // Set current status.
    setEditDialogOpen(true); // Open dialog.
  };

  /**
   * Open delete confirmation dialog with selected record.
   */
  const openDeleteDialog = (record: AttendanceRecord) => {
    setDeleteRecord(record); // Set record to delete.
    setDeleteDialogOpen(true); // Open dialog.
  };

  /**
   * Get status badge color.
   */
  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800"; // Green for present.
      case "absent":
        return "bg-red-100 text-red-800"; // Red for absent.
      case "late":
        return "bg-yellow-100 text-yellow-800"; // Yellow for late.
      default:
        return "bg-gray-100 text-gray-800"; // Gray for unknown.
    }
  };

  /**
   * Format date for display.
   */
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /**
   * Apply filters and reset to page 1.
   */
  const applyFilters = () => {
    setPage(1); // Reset to first page.
    fetchAttendance(); // Fetch with new filters.
  };

  /**
   * Clear all filters - reset to "__all__" sentinel for Radix Select compatibility.
   */
  const clearFilters = () => {
    setSemesterFilter("__all__");
    setDepartmentFilter("__all__");
    setCourseFilter("__all__");
    setRollFilter("");
    setStatusFilter("__all__");
    setFromDateFilter("");
    setToDateFilter("");
    setPage(1); // Reset to first page.
  };

  return (
    <div className="space-y-6"> {/* Page container. */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> {/* Calendar icon. */}
              Manage Attendance
            </CardTitle>
            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* Bulk Mark Attendance Dialog */}
              <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> {/* Calendar icon. */}
                    Mark Bulk
                  </Button>
                </DialogTrigger>
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
                        onChange={(e) => {
                          setBulkDate(e.target.value);
                          if (bulkCourse) fetchStudentsForBulk(bulkCourse); // Reload with existing attendance.
                        }}
                      />
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

              {/* Single Mark Attendance Dialog */}
              <Dialog open={markDialogOpen} onOpenChange={setMarkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> {/* Plus icon. */}
                    Mark Single
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Mark Attendance</DialogTitle>
                  <DialogDescription>
                    Create a new attendance record for a student.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Semester Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="markSemester">Semester *</Label>
                    <Select value={markSemester} onValueChange={setMarkSemester}>
                      <SelectTrigger id="markSemester">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            Semester {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Department Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="markDepartment">Department *</Label>
                    <Select value={markDepartment} onValueChange={setMarkDepartment}>
                      <SelectTrigger id="markDepartment">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Course Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="markCourse">Subject *</Label>
                    <Select 
                      value={markCourse} 
                      onValueChange={setMarkCourse}
                      disabled={!markSemester || !markDepartment}
                    >
                      <SelectTrigger id="markCourse">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {markCourses.map((course) => (
                          <SelectItem key={course.id} value={String(course.id)}>
                            {course.code} - {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Student Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="markStudent">Student *</Label>
                    <Select 
                      value={markStudent} 
                      onValueChange={setMarkStudent}
                      disabled={!markSemester || !markDepartment}
                    >
                      <SelectTrigger id="markStudent">
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.roll} value={student.roll}>
                            {student.name} ({student.admissionNo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="markDate">Date *</Label>
                    <Input
                      id="markDate"
                      type="date"
                      value={markDate}
                      onChange={(e) => setMarkDate(e.target.value)}
                    />
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="markStatus">Status *</Label>
                    <Select value={markStatus} onValueChange={(v) => setMarkStatus(v as AttendanceStatus)}>
                      <SelectTrigger id="markStatus">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleMarkAttendance}
                      disabled={marking}
                      className="flex-1"
                    >
                      {marking ? "Saving..." : "Save"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setMarkDialogOpen(false);
                        resetMarkForm();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error display */}
          {error && (
            <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {/* Error icon. */}
              {error}
            </div>
          )}

          {/* URL Hydration Info - shown when arriving from dashboard with context */}
          {searchParams.get("courseId") && (
            <div className="p-3 rounded border border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {/* Check icon. */}
              <span>
                Attendance context loaded from your current class.
                {searchParams.get("period") && ` Period: ${searchParams.get("period")}`}
                {searchParams.get("semester") && ` | Semester: ${searchParams.get("semester")}`}
              </span>
            </div>
          )}

          {/* Filter Section */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" /> {/* Filter icon. */}
              Filters
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Semester Filter - uses "__all__" sentinel for Radix compatibility. */}
              <div className="space-y-1">
                <Label className="text-xs">Semester</Label>
                <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Semesters</SelectItem>
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Semester {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter - uses "__all__" sentinel for Radix compatibility. */}
              <div className="space-y-1">
                <Label className="text-xs">Department</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Filter - uses "__all__" sentinel for Radix compatibility. */}
              <div className="space-y-1">
                <Label className="text-xs">Subject</Label>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Subjects</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={String(course.id)}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter - uses "__all__" sentinel for Radix compatibility. */}
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Roll Filter */}
              <div className="space-y-1">
                <Label className="text-xs">Student Roll</Label>
                <Input
                  placeholder="Enter roll number"
                  value={rollFilter}
                  onChange={(e) => setRollFilter(e.target.value)}
                />
              </div>

              {/* From Date Filter */}
              <div className="space-y-1">
                <Label className="text-xs">From Date</Label>
                <Input
                  type="date"
                  value={fromDateFilter}
                  onChange={(e) => setFromDateFilter(e.target.value)}
                />
              </div>

              {/* To Date Filter */}
              <div className="space-y-1">
                <Label className="text-xs">To Date</Label>
                <Input
                  type="date"
                  value={toDateFilter}
                  onChange={(e) => setToDateFilter(e.target.value)}
                />
              </div>

              {/* Filter Actions */}
              <div className="space-y-1 flex items-end gap-2">
                <Button variant="default" size="sm" onClick={applyFilters}>
                  Apply
                </Button>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Total count display */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Total: {totalCount} records
            </span>
          </div>

          {/* Attendance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Student</th>
                  <th className="text-left p-3 font-medium">Admission No</th>
                  <th className="text-left p-3 font-medium">Department</th>
                  <th className="text-left p-3 font-medium">Subject</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Marked By</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : attendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No attendance records found. Click "Mark Attendance" to add records.
                    </td>
                  </tr>
                ) : (
                  attendance.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs">{formatDate(record.date)}</td>
                      <td className="p-3">{record.studentName || "-"}</td>
                      <td className="p-3 font-mono text-xs">{record.admissionNo || record.roll}</td>
                      <td className="p-3">{record.department || "-"}</td>
                      <td className="p-3">
                        <span className="font-mono text-xs mr-1">{record.courseCode}</span>
                        <span className="text-muted-foreground">{record.courseName}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusBadge(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {record.markedByName || "-"}
                        {record.updatedByName && (
                          <span className="block text-xs">(edited by {record.updatedByName})</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(record)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" /> {/* Edit icon. */}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(record)}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" /> {/* Delete icon. */}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-end items-center space-x-4 pt-4">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Attendance Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
            <DialogDescription>
              Update the status for this attendance record.
            </DialogDescription>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <p><strong>Student:</strong> {editRecord.studentName}</p>
                <p><strong>Date:</strong> {formatDate(editRecord.date)}</p>
                <p><strong>Subject:</strong> {editRecord.courseCode} - {editRecord.courseName}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as AttendanceStatus)}>
                  <SelectTrigger id="editStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateAttendance} disabled={updating} className="flex-1">
                  {updating ? "Updating..." : "Update"}
                </Button>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Attendance Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this attendance record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteRecord && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm space-y-1">
                <p><strong>Student:</strong> {deleteRecord.studentName}</p>
                <p><strong>Date:</strong> {formatDate(deleteRecord.date)}</p>
                <p><strong>Status:</strong> {deleteRecord.status}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAttendance} 
                  disabled={deleting}
                  className="flex-1"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}