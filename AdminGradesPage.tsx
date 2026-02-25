/**
 * AdminGradesPage.tsx
 * 
 * Admin page for managing subject-wise grades with CSV import functionality.
 * Supports:
 * - Viewing subject grades with filtering by subject and exam
 * - CSV upload for bulk grade import
 * - Download sample CSV template
 */

import React, { useEffect, useState } from "react"; // Import React hooks.
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
} from "@/components/ui/dialog"; // Import Dialog components for modal.
import { Upload, Download, CheckCircle, AlertCircle, Plus, Loader2 } from "lucide-react"; // Import icons including Plus and Loader2 for add button and loading state.

// Import mode type
type GradeImportMode = 'series' | 'semester';

// Interface for subject grade from API
interface SubjectGrade {
  id: number; // Grade record ID.
  student_admission_no: string; // Student admission number.
  student_name: string | null; // Student name (may be null if not linked).
  class_name: string | null; // Class name (may be null).
  subject_id: number; // Subject ID.
  subject_code: string; // Subject code.
  subject_name: string; // Subject name.
  exam_id: number; // Exam ID.
  exam_code: string; // Exam code.
  exam_name: string; // Exam name.
  marks: number | null; // Marks obtained (nullable for semester exams).
  grade: string | null; // Letter grade (may be null).
  comments: string | null; // Comments (may be null).
}

// Interface for exam
interface Exam {
  id: number; // Exam ID.
  code: string; // Exam code.
  name: string; // Exam name.
  academic_year: string | null; // Academic year (may be null).
}

// Interface for subject (course)
interface Subject {
  id: number; // Subject ID.
  code: string; // Subject code.
  name: string; // Subject name.
}

// Interface for CSV import result
interface CsvImportResult {
  totalRows: number; // Total rows in CSV.
  imported: number; // Number of rows imported.
  updated: number; // Number of rows updated.
  failed: number; // Number of rows that failed.
  errors: Array<{
    row: number; // Row number with error.
    message: string; // Error message.
  }>;
}

/**
 * AdminGradesPage - Manage subject-wise grades with CSV import.
 * Renders at /admin/grades route.
 */
export default function AdminGradesPage() {
  // State for grades list
  const [grades, setGrades] = useState<SubjectGrade[]>([]); // Hold grades data.
  const [loading, setLoading] = useState(false); // Track loading state.
  const [error, setError] = useState<string>(""); // Hold error message.

  // State for filters
  const [searchTerm, setSearchTerm] = useState(""); // Search term for admission no/name.
  const [subjectFilter, setSubjectFilter] = useState("all"); // Selected subject filter.
  const [examFilter, setExamFilter] = useState("all"); // Selected exam filter.

  // State for pagination
  const [page, setPage] = useState(1); // Current page number.
  const [totalPages, setTotalPages] = useState(1); // Total pages available.
  const [totalCount, setTotalCount] = useState(0); // Total count of grades.
  const [fetchTrigger, setFetchTrigger] = useState(0); // Trigger to refetch grades.

  // State for dropdown options
  const [subjects, setSubjects] = useState<Subject[]>([]); // List of subjects for dropdown.
  const [exams, setExams] = useState<Exam[]>([]); // List of exams for dropdown.

  // State for CSV upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false); // Whether upload dialog is open.
  const [uploadFile, setUploadFile] = useState<File | null>(null); // Selected CSV file.
  const [uploading, setUploading] = useState(false); // Track upload in progress.
  const [uploadResult, setUploadResult] = useState<CsvImportResult | null>(null); // Upload result.
  const [importMode, setImportMode] = useState<GradeImportMode>('series'); // Import mode: series or semester.

  // State for Add Grade dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false); // Whether add grade dialog is open.
  const [addAdmissionNo, setAddAdmissionNo] = useState(""); // Admission number input.
  const [addSubjectId, setAddSubjectId] = useState(""); // Selected subject ID.
  const [addExamId, setAddExamId] = useState(""); // Selected exam ID.
  const [addMarks, setAddMarks] = useState(""); // Marks input.
  const [addGrade, setAddGrade] = useState(""); // Grade input (optional).
  const [addComments, setAddComments] = useState(""); // Comments input.
  const [adding, setAdding] = useState(false); // Track add in progress.
  const [addError, setAddError] = useState<string | null>(null); // Error message for add dialog.

  // State for student search
  const [studentSearch, setStudentSearch] = useState(""); // Search term for student dropdown.
  const [studentResults, setStudentResults] = useState<Array<{ admission_no: string; name: string }>>([]); // Search results.
  const [searchingStudents, setSearchingStudents] = useState(false); // Track student search in progress.

  /**
   * Fetch subject grades from API with current filters.
   */
  const fetchGrades = async () => {
    setLoading(true); // Set loading state.
    setError(""); // Clear previous error.
    try {
      const params = new URLSearchParams({
        page: page.toString(), // Add page number.
        search: searchTerm, // Add search term.
      });
      // Add subject filter if not "all".
      if (subjectFilter !== "all") {
        params.append("subject_id", subjectFilter);
      }
      // Add exam filter if not "all".
      if (examFilter !== "all") {
        params.append("exam_id", examFilter);
      }

      // Call API to get grades.
      const res = await apiClient.get<{ grades: SubjectGrade[]; totalPages: number; totalCount: number }>(
        `/admin/subject-grades?${params.toString()}`
      );
      setGrades(res.data.grades); // Store grades.
      setTotalPages(res.data.totalPages); // Store total pages.
      setTotalCount(res.data.totalCount); // Store total count.
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load grades"); // Set error message.
    } finally {
      setLoading(false); // Clear loading state.
    }
  };

  /**
   * Fetch subjects (courses) for dropdown filter.
   */
  const fetchSubjects = async () => {
    try {
      const res = await apiClient.get<Subject[]>("/v1/courses"); // Fetch courses.
      setSubjects(res.data); // Store subjects.
    } catch (e) {
      console.error("Failed to fetch subjects:", e); // Log error.
    }
  };

  /**
   * Fetch exams for dropdown filter.
   */
  const fetchExams = async () => {
    try {
      const res = await apiClient.get<Exam[]>("/admin/exams"); // Fetch exams.
      setExams(res.data); // Store exams.
    } catch (e) {
      console.error("Failed to fetch exams:", e); // Log error.
    }
  };

  // Initial data fetch on mount.
  useEffect(() => {
    fetchSubjects(); // Fetch subjects.
    fetchExams(); // Fetch exams.
  }, []);

  // Fetch grades when filters or page change.
  useEffect(() => {
    fetchGrades();
  }, [searchTerm, subjectFilter, examFilter, page, fetchTrigger]);

  /**
   * Handle CSV file selection.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; // Get selected file.
    if (file) {
      setUploadFile(file); // Store selected file.
      setUploadResult(null); // Clear previous result.
    }
  };

  /**
   * Handle CSV upload to backend with mode parameter.
   */
  const handleUpload = async () => {
    if (!uploadFile) return; // Guard: no file selected.

    setUploading(true); // Set uploading state.
    setError(""); // Clear previous error.

    try {
      const formData = new FormData(); // Create form data.
      formData.append("csv", uploadFile); // Add CSV file.
      formData.append("mode", importMode); // Add import mode.

      // Call API to upload CSV with mode query param.
      // NOTE: Do NOT set Content-Type header manually - let axios/browser set it
      // with the correct multipart boundary automatically. The apiClient interceptor
      // will attach the Authorization header from localStorage.
      const res = await apiClient.post<CsvImportResult>(
        `/admin/subject-grades/import?mode=${importMode}`,
        formData
      );

      setUploadResult(res.data); // Store upload result.

      // Refresh grades list after successful upload.
      if (res.data.imported > 0 || res.data.updated > 0) {
        setFetchTrigger((t) => t + 1); // Trigger refetch.
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to upload CSV"); // Set error message.
    } finally {
      setUploading(false); // Clear uploading state.
    }
  };

  /**
   * Handle grade deletion.
   */
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this grade?")) return; // Confirm deletion.

    try {
      await apiClient.delete(`/admin/subject-grades/${id}`); // Call delete API.
      setFetchTrigger((t) => t + 1); // Trigger refetch.
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to delete grade"); // Set error message.
    }
  };

  /**
   * Download sample CSV template with headers based on selected mode.
   * Series mode: includes marks column, grade auto-calculated.
   * Semester mode: includes grade column, no marks.
   */
  const downloadSampleCsv = () => {
    let headers: string[];
    let sampleRow: string[];
    let filename: string;

    if (importMode === 'series') {
      // Series exam template: marks required, grade auto-calculated.
      headers = ["admission_no", "subject_code", "exam_code", "marks", "comments"];
      sampleRow = ["0001", "CT101", "S1_SERIES_1", "85", "Excellent performance"];
      filename = "series_grades_template.csv";
    } else {
      // Semester exam template: grade required, no marks.
      headers = ["admission_no", "subject_code", "exam_code", "grade", "comments"];
      sampleRow = ["0001", "CT101", "S1_SEMESTER", "A", "Excellent performance"];
      filename = "semester_grades_template.csv";
    }
    
    // Combine headers and sample row.
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    
    // Create blob and download.
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename; // Dynamic filename based on mode.
    document.body.appendChild(a);
    a.click(); // Trigger download.
    document.body.removeChild(a); // Clean up.
    window.URL.revokeObjectURL(url); // Release URL.
  };

  /**
   * Get CSV format description based on selected mode.
   */
  const getCsvFormatDescription = () => {
    if (importMode === 'series') {
      return {
        headers: "admission_no, subject_code, exam_code, marks, comments",
        note: "Grade will be auto-calculated from marks (≥90=A+, ≥80=A, etc.)"
      };
    } else {
      return {
        headers: "admission_no, subject_code, exam_code, grade, comments",
        note: "Marks column not needed for semester exams"
      };
    }
  };

  /**
   * Close upload dialog and reset state.
   */
  const closeUploadDialog = () => {
    setUploadDialogOpen(false); // Close dialog.
    setUploadFile(null); // Clear file.
    setUploadResult(null); // Clear result.
  };

  /**
   * Search students by admission number or name.
   * Calls /api/admin/students?search=... endpoint.
   */
  const searchStudents = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 1) {
      setStudentResults([]); // Clear results if search term is empty.
      return;
    }

    setSearchingStudents(true); // Set searching state.
    try {
      const res = await apiClient.get<{ data: Array<{ admission_no: string; name: string }> }>(
        `/admin/students?search=${encodeURIComponent(searchTerm)}&pageSize=10`
      );
      // Extract admission_no and name from response data.
      const students = res.data.data.map((s: any) => ({
        admission_no: s.admission_no || s.roll || "", // Use admission_no or roll as fallback.
        name: s.name || "", // Student name.
      }));
      setStudentResults(students); // Store search results.
    } catch (e) {
      console.error("Failed to search students:", e); // Log error.
      setStudentResults([]); // Clear results on error.
    } finally {
      setSearchingStudents(false); // Clear searching state.
    }
  };

  /**
   * Auto-calculate grade from marks using same logic as backend.
   */
  const calculateGradeFromMarks = (marks: number): string => {
    if (marks >= 90) return "A+"; // 90-100: A+
    if (marks >= 80) return "A"; // 80-89: A
    if (marks >= 70) return "B+"; // 70-79: B+
    if (marks >= 60) return "B"; // 60-69: B
    if (marks >= 50) return "C+"; // 50-59: C+
    if (marks >= 40) return "C"; // 40-49: C
    return "F"; // 0-39: F
  };

  /**
   * Handle marks change and auto-calculate grade.
   */
  const handleMarksChange = (value: string) => {
    setAddMarks(value); // Update marks state.
    const marksNum = parseInt(value, 10);
    if (!isNaN(marksNum) && marksNum >= 0 && marksNum <= 100) {
      setAddGrade(calculateGradeFromMarks(marksNum)); // Auto-calculate grade.
    }
  };

  /**
   * Handle manual grade submission.
   */
  const handleAddGrade = async () => {
    // Validate required fields.
    if (!addAdmissionNo || !addSubjectId || !addExamId) {
      setAddError("Please fill in admission number, subject, and exam.");
      return;
    }

    // Validate marks if provided.
    const marksNum = addMarks ? parseInt(addMarks, 10) : undefined;
    if (addMarks && (isNaN(marksNum!) || marksNum! < 0 || marksNum! > 100)) {
      setAddError("Marks must be a number between 0 and 100.");
      return;
    }

    setAdding(true); // Set adding state.
    setAddError(null); // Clear previous error.

    try {
      // Call API to create grade.
      const res = await apiClient.post<{ success: boolean; data: SubjectGrade; message: string }>(
        "/admin/subject-grades",
        {
          admission_no: addAdmissionNo, // Admission number.
          subject_id: parseInt(addSubjectId, 10), // Subject ID.
          exam_id: parseInt(addExamId, 10), // Exam ID.
          marks: marksNum, // Marks (optional).
          grade: addGrade || undefined, // Grade (optional, auto-calculated if marks provided).
          comments: addComments || undefined, // Comments (optional).
        }
      );

      if (res.data.success) {
        // Close dialog and reset form.
        setAddDialogOpen(false);
        resetAddForm();
        setFetchTrigger((t) => t + 1); // Trigger refetch.
      }
    } catch (e: any) {
      setAddError(e?.response?.data?.message || "Failed to add grade."); // Set error message.
    } finally {
      setAdding(false); // Clear adding state.
    }
  };

  /**
   * Reset add grade form state.
   */
  const resetAddForm = () => {
    setAddAdmissionNo(""); // Clear admission number.
    setAddSubjectId(""); // Clear subject.
    setAddExamId(""); // Clear exam.
    setAddMarks(""); // Clear marks.
    setAddGrade(""); // Clear grade.
    setAddComments(""); // Clear comments.
    setAddError(null); // Clear error.
    setStudentSearch(""); // Clear student search.
    setStudentResults([]); // Clear student results.
  };

  // Debounced student search effect.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (studentSearch) {
        searchStudents(studentSearch); // Search students when search term changes.
      }
    }, 300); // 300ms debounce.
    return () => clearTimeout(timer); // Cleanup timer.
  }, [studentSearch]);

  return (
    <div className="space-y-6"> {/* Page container. */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Manage Grades</CardTitle> {/* Page title. */}
            {/* Action buttons container */}
            <div className="flex gap-2">
              {/* Add Grade Dialog */}
              <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetAddForm(); }}>
                <DialogTrigger asChild>
                  <Button variant="default" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> {/* Plus icon for add. */}
                    Add Grade
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Grade</DialogTitle>
                    <DialogDescription>
                      Enter grade details for a student. Grade will be auto-calculated from marks.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Student Admission Number with search */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Student Admission No *</label>
                      <Input
                        placeholder="Search by admission no or name..."
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value); // Update search term.
                          if (e.target.value.length === 0) {
                            setStudentResults([]); // Clear results if empty.
                          }
                        }}
                        disabled={adding}
                      />
                      {/* Student search results dropdown */}
                      {studentResults.length > 0 && (
                        <div className="border rounded-md max-h-32 overflow-y-auto">
                          {studentResults.map((s) => (
                            <button
                              key={s.admission_no}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                              onClick={() => {
                                setAddAdmissionNo(s.admission_no); // Set selected admission no.
                                setStudentSearch(s.admission_no); // Update search field.
                                setStudentResults([]); // Clear results.
                              }}
                            >
                              <span className="font-mono">{s.admission_no}</span>
                              <span className="text-muted-foreground ml-2">{s.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Manual admission no input */}
                      <Input
                        placeholder="Or enter admission number directly"
                        value={addAdmissionNo}
                        onChange={(e) => setAddAdmissionNo(e.target.value)}
                        disabled={adding}
                        className="mt-2"
                      />
                    </div>

                    {/* Subject dropdown */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subject *</label>
                      <Select value={addSubjectId} onValueChange={setAddSubjectId} disabled={adding}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={String(subject.id)}>
                              {subject.code} - {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Exam dropdown */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Exam *</label>
                      <Select value={addExamId} onValueChange={setAddExamId} disabled={adding}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exam" />
                        </SelectTrigger>
                        <SelectContent>
                          {exams.map((exam) => (
                            <SelectItem key={exam.id} value={String(exam.id)}>
                              {exam.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Marks input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Marks (0-100)</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Enter marks"
                        value={addMarks}
                        onChange={(e) => handleMarksChange(e.target.value)}
                        disabled={adding}
                      />
                    </div>

                    {/* Grade display/input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Grade</label>
                      <Input
                        placeholder="Auto-calculated from marks"
                        value={addGrade}
                        onChange={(e) => setAddGrade(e.target.value.toUpperCase())}
                        disabled={adding}
                      />
                      <p className="text-xs text-muted-foreground">
                        Grade is auto-calculated from marks. You can override if needed.
                      </p>
                    </div>

                    {/* Comments input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Comments</label>
                      <Input
                        placeholder="Optional comments"
                        value={addComments}
                        onChange={(e) => setAddComments(e.target.value)}
                        disabled={adding}
                      />
                    </div>

                    {/* Error display */}
                    {addError && (
                      <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
                        {addError}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button onClick={handleAddGrade} disabled={adding} className="flex-1">
                        {adding ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Grade"
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetAddForm(); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* CSV Upload Dialog */}
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" /> {/* Upload icon. */}
                    Upload Grades (CSV)
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Upload Grades from CSV</DialogTitle>
                  <DialogDescription>
                    Import grades in bulk by uploading a CSV file. Choose series or semester exam type.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Exam Type Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Exam Type:</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="series"
                          checked={importMode === 'series'}
                          onChange={() => setImportMode('series')}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Series Exam (marks → auto grade)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="semester"
                          checked={importMode === 'semester'}
                          onChange={() => setImportMode('semester')}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Semester Exam (grade only)</span>
                      </label>
                    </div>
                  </div>

                  {/* CSV format info - dynamic based on mode */}
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-semibold mb-1">CSV Format:</p>
                    <code className="text-xs block mb-1">
                      {getCsvFormatDescription().headers}
                    </code>
                    <p className="text-xs text-muted-foreground">
                      {getCsvFormatDescription().note}
                    </p>
                  </div>

                  {/* Download template button */}
                  <Button
                    variant="outline"
                    onClick={downloadSampleCsv}
                    className="w-full flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" /> {/* Download icon. */}
                    Download {importMode === 'series' ? 'Series' : 'Semester'} CSV Template
                  </Button>

                  {/* File input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select CSV File:</label>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                    {uploadFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {uploadFile.name}
                      </p>
                    )}
                  </div>

                  {/* Error display */}
                  {error && (
                    <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {/* Error icon. */}
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Upload result */}
                  {uploadResult && (
                    <div className="space-y-3">
                      <div className="p-3 rounded border border-green-200 bg-green-50">
                        <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                          <CheckCircle className="h-4 w-4" /> {/* Success icon. */}
                          Import Complete
                        </div>
                        <div className="text-sm space-y-1">
                          <p>Total rows: {uploadResult.totalRows}</p>
                          <p className="text-green-600">Imported: {uploadResult.imported}</p>
                          <p className="text-blue-600">Updated: {uploadResult.updated}</p>
                          <p className="text-red-600">Failed: {uploadResult.failed}</p>
                        </div>
                      </div>

                      {/* Error details */}
                      {uploadResult.errors.length > 0 && (
                        <div className="max-h-40 overflow-y-auto border rounded p-2 text-sm">
                          <p className="font-semibold text-red-600 mb-1">Errors:</p>
                          {uploadResult.errors.map((err, idx) => (
                            <div key={idx} className="text-red-600">
                              Row {err.row}: {err.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpload}
                      disabled={!uploadFile || uploading}
                      className="flex-1"
                    >
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                    <Button variant="outline" onClick={closeUploadDialog}>
                      Close
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
            <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700">{error}</div>
          )}

          {/* Search and filters */}
          <div className="flex justify-between items-center">
            <div className="w-1/3">
              <Input
                placeholder="Search by admission no or student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Subject filter dropdown */}
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={String(subject.id)}>
                    {subject.code} - {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Exam filter dropdown */}
            <Select value={examFilter} onValueChange={setExamFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={String(exam.id)}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Total count display */}
            <div className="flex items-center text-sm text-muted-foreground">
              Total: {totalCount} grades
            </div>
          </div>

          {/* Grades table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Admission No</th>
                  <th className="text-left p-2">Student Name</th>
                  <th className="text-left p-2">Subject</th>
                  <th className="text-left p-2">Exam</th>
                  <th className="text-left p-2">Marks</th>
                  <th className="text-left p-2">Grade</th>
                  <th className="text-left p-2">Comments</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.id} className="border-b">
                    <td className="p-2 font-mono">{g.student_admission_no}</td>
                    <td className="p-2">{g.student_name || "-"}</td>
                    <td className="p-2">
                      <span className="font-mono text-xs mr-1">{g.subject_code}</span>
                      {g.subject_name}
                    </td>
                    <td className="p-2">{g.exam_name}</td>
                    <td className="p-2 font-semibold">{g.marks ?? "-"}</td>
                    <td className="p-2">
                      {g.grade ? (
                        <span className="px-2 py-1 bg-primary/10 rounded text-primary font-semibold">
                          {g.grade}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground max-w-xs truncate">
                      {g.comments || "-"}
                    </td>
                    <td className="p-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(g.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {grades.length === 0 && (
                  <tr>
                    <td className="p-4 text-muted-foreground text-center" colSpan={8}>
                      {loading ? "Loading..." : "No grades found. Upload a CSV to add grades."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-end items-center space-x-4">
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}