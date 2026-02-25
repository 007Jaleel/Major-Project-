/**
 * StudentGrades.tsx
 *
 * Student progress view:
 * - Shows SGPA for each of the 6 semesters (when available)
 * - Shows overall CGPA computed from all semesters
 * - Lists grades by semester
 * - Shows subject-wise grades grouped by exam (new system)
 */

import React, { useEffect, useMemo, useState } from "react"; // Import React hooks.
import apiClient from "@/lib/apiClient"; // Import axios for API calls.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components.
import { Button } from "@/components/ui/button"; // Import Button component.
import SgpaTrendChart, { SgpaTrendPoint } from "@/components/grades/SgpaTrendChart"; // Import SGPA trend chart component.
import { ChevronDown, ChevronRight } from "lucide-react"; // Import icons for expand/collapse.

type ProgressGrade = { // Define grade row shape.
  id: number; // Grade id.
  roll: string; // Student roll.
  course_id: number; // Course id.
  total: number; // Total marks.
  grade?: string; // Grade letter.
  semester: number; // Semester number.
  code: string; // Course code.
  name: string; // Course name.
  credits: number; // Credits.
  branch: string; // Branch.
};

type ProgressResponse = { // Define response shape.
  grades: ProgressGrade[]; // Grade list.
  sgpa: { semester: number; sgpa: number; credits: number }[]; // SGPA list.
  cgpa: number; // CGPA.
  attendance: { semester: number; total: number; present: number }[]; // Attendance per semester.
};

// Types for subject-wise grades from new system
type SubjectGradeItem = { // Define subject grade item shape.
  subject: { // Subject details.
    id: number; // Subject ID.
    code: string; // Subject code.
    name: string; // Subject name.
    credits: number | null; // Credits.
  };
  marks: number | null; // Marks obtained (null for semester exams).
  grade: string | null; // Grade letter.
  comments: string | null; // Comments.
};

type ExamGrades = { // Define exam grades shape.
  exam: { // Exam details.
    id: number; // Exam ID.
    code: string; // Exam code.
    name: string; // Exam name.
  };
  subjects: SubjectGradeItem[]; // List of subject grades.
};

type SubjectGradesResponse = { // Define response shape for subject grades.
  admission_no: string; // Admission number.
  student_name: string | null; // Student name.
  exams: ExamGrades[]; // List of exam grades.
};

const getStudentRoll = () => { // Helper to get roll from localStorage.
  return (
    localStorage.getItem("roll") || // Prefer roll key.
    localStorage.getItem("admissionNo") || // Fallback to admissionNo key.
    "" // Fallback to empty.
  );
};

export default function StudentGrades() { // Export grades/progress page.
  const [selectedSemester, setSelectedSemester] = useState<number | "all">("all"); // Track semester filter.
  const [data, setData] = useState<ProgressResponse | null>(null); // Hold progress data.
  const [loading, setLoading] = useState(false); // Track loading.
  const [error, setError] = useState<string>(""); // Track error.

  // State for subject-wise grades (new system)
  const [subjectGrades, setSubjectGrades] = useState<SubjectGradesResponse | null>(null); // Hold subject grades data.
  const [subjectGradesLoading, setSubjectGradesLoading] = useState(false); // Track loading for subject grades.
  const [expandedExams, setExpandedExams] = useState<Set<number>>(new Set()); // Track which exams are expanded.

  const roll = useMemo(() => getStudentRoll(), []); // Determine roll once for this page.

  const fetchProgress = async () => { // Fetch progress from backend.
    if (!roll) { // Validate roll.
      setError("Missing roll/admission number. Please logout and login again to refresh your session."); // Tell user to login.
      setLoading(false); // Ensure loading is cleared.
      return; // Exit.
    }
    setLoading(true); // Set loading.
    setError(""); // Clear error.
    try {
      const res = await apiClient.get<ProgressResponse>(`/v1/students/${roll}/progress`); // Call progress endpoint (apiClient already adds /api prefix).
      setData(res.data); // Store response.
    } catch (e: any) {
      // Handle specific error cases with more user-friendly messages.
      const errorMessage = e?.response?.data?.error || e?.message || "Failed to load progress";
      if (errorMessage === "Route not found") {
        setError("Unable to load grades. Please ensure you are logged in with a valid student account.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false); // Clear loading.
    }
  };

  useEffect(() => { // Fetch on mount.
    fetchProgress(); // Trigger fetch.
    fetchSubjectGrades(); // Also fetch subject-wise grades.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch subject-wise grades from new system
  const fetchSubjectGrades = async () => {
    setSubjectGradesLoading(true);
    try {
      const res = await apiClient.get<SubjectGradesResponse>("/v1/student/subject-grades");
      setSubjectGrades(res.data);
    } catch (e) {
      // Silently fail - subject grades are optional supplement
      console.log("Subject grades not available:", e);
    } finally {
      setSubjectGradesLoading(false);
    }
  };

  // Toggle exam expansion
  const toggleExam = (examId: number) => {
    setExpandedExams((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) {
        next.delete(examId);
      } else {
        next.add(examId);
      }
      return next;
    });
  };

  // Helper to check if exam is a semester exam (grade-only, no marks)
  const isSemesterExam = (examCode: string): boolean => {
    return examCode.toUpperCase().includes('SEMESTER');
  };

  const filteredGrades = useMemo(() => { // Compute grades filtered by selected semester.
    if (!data) return []; // Return empty if no data.
    if (selectedSemester === "all") return data.grades; // Return all grades.
    return data.grades.filter((g) => Number(g.semester) === Number(selectedSemester)); // Filter by semester.
  }, [data, selectedSemester]);

  const sgpaTrendData: SgpaTrendPoint[] = useMemo(() => { // Build chart data for SGPA trend.
    if (!data) return []; // Return empty dataset if data is missing.
    const bySemester = new Map<number, number>(); // Create lookup of semester -> sgpa.
    data.sgpa.forEach((row) => {
      bySemester.set(Number(row.semester), Number(row.sgpa)); // Store sgpa value for the semester.
    });
    return [1, 2, 3, 4, 5, 6].map((s) => ({
      semesterLabel: `Sem ${s}`, // Build x-axis label.
      sgpa: bySemester.get(s) ?? 0, // Use found sgpa or 0 if not available.
    }));
  }, [data]);

  return ( // Render page.
    <div className="space-y-6"> {/* Page container. */}
      <Card> {/* Header card. */}
        <CardHeader> {/* Header. */}
          <CardTitle>Grades & CGPA Progress</CardTitle> {/* Title. */}
        </CardHeader>
        <CardContent className="space-y-4"> {/* Content. */}
          {error && (
            <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700">{error}</div> // Error block.
          )}
          <div className="flex items-center gap-3"> {/* Actions row. */}
            <Button variant="outline" onClick={fetchProgress} disabled={loading}> {/* Refresh button. */}
              {loading ? "Refreshing..." : "Refresh"} {/* Button label. */}
            </Button>
            <div className="text-sm text-muted-foreground"> {/* Roll display. */}
              Roll: <span className="font-mono text-foreground">{roll || "-"}</span> {/* Value. */}
            </div>
          </div>

          {data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Summary grid. */}
              <div className="p-4 rounded-lg border"> {/* CGPA card. */}
                <div className="text-sm text-muted-foreground">Overall CGPA</div> {/* Label. */}
                <div className="text-3xl font-bold">{data.cgpa}</div> {/* Value. */}
              </div>
              <div className="p-4 rounded-lg border"> {/* Semesters card. */}
                <div className="text-sm text-muted-foreground">Semesters Completed</div> {/* Label. */}
                <div className="text-3xl font-bold">{data.sgpa.length}</div> {/* Value. */}
              </div>
              <div className="p-4 rounded-lg border"> {/* Attendance info. */}
                <div className="text-sm text-muted-foreground">Attendance Records</div> {/* Label. */}
                <div className="text-3xl font-bold">{data.attendance.reduce((a, s) => a + Number(s.total || 0), 0)}</div> {/* Value. */}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <Card> {/* SGPA card. */}
          <CardHeader> {/* Header. */}
            <CardTitle>Semester-wise SGPA</CardTitle> {/* Title. */}
          </CardHeader>
          <CardContent> {/* Content. */}
            <div className="mb-6"> {/* Chart wrapper. */}
              <div className="flex items-center justify-between mb-3"> {/* Chart header row. */}
                <div className="text-sm text-muted-foreground">SGPA Trend</div> {/* Chart label. */}
                <div className="text-xs text-muted-foreground">Sem 1 → Sem 6</div> {/* Small helper text. */}
              </div>
              <SgpaTrendChart data={sgpaTrendData} height={220} /> {/* Render SGPA area chart. */}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3"> {/* Grid. */}
              {[1, 2, 3, 4, 5, 6].map((s) => { // Iterate semesters.
                const found = data.sgpa.find((x) => Number(x.semester) === s); // Find SGPA entry.
                return (
                  <div key={s} className="p-4 rounded-lg border"> {/* Semester card. */}
                    <div className="text-sm text-muted-foreground">Semester {s}</div> {/* Label. */}
                    <div className="text-2xl font-bold">{found ? found.sgpa : "-"}</div> {/* Value. */}
                    <div className="text-xs text-muted-foreground">Credits: {found ? found.credits : "-"}</div> {/* Credits. */}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card> {/* Grades list card. */}
        <CardHeader> {/* Header. */}
          <CardTitle>Grades</CardTitle> {/* Title. */}
        </CardHeader>
        <CardContent className="space-y-4"> {/* Content. */}
          <div className="flex items-center gap-3"> {/* Filter row. */}
            <label className="text-sm font-medium">Semester:</label> {/* Label. */}
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm" // Select style.
              value={selectedSemester} // Bind value.
              onChange={(e) => setSelectedSemester(e.target.value === "all" ? "all" : Number(e.target.value))} // Update state.
            >
              <option value="all">All</option> {/* All option. */}
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <option key={s} value={s}>{`Semester ${s}`}</option> // Semester options.
              ))}
            </select>
          </div>

          <div className="overflow-x-auto"> {/* Table wrapper. */}
            <table className="w-full text-sm"> {/* Table. */}
              <thead> {/* Header. */}
                <tr className="border-b"> {/* Header row. */}
                  <th className="text-left p-2">Sem</th> {/* Semester header. */}
                  <th className="text-left p-2">Code</th> {/* Code header. */}
                  <th className="text-left p-2">Subject</th> {/* Subject header. */}
                  <th className="text-left p-2">Credits</th> {/* Credits header. */}
                  <th className="text-left p-2">Marks</th> {/* Marks header. */}
                  <th className="text-left p-2">Grade</th> {/* Grade header. */}
                </tr>
              </thead>
              <tbody> {/* Body. */}
                {filteredGrades.map((g) => (
                  <tr key={g.id} className="border-b"> {/* Row. */}
                    <td className="p-2">{g.semester}</td> {/* Sem cell. */}
                    <td className="p-2 font-mono">{g.code}</td> {/* Code cell. */}
                    <td className="p-2">{g.name}</td> {/* Name cell. */}
                    <td className="p-2">{g.credits}</td> {/* Credits cell. */}
                    <td className="p-2">{g.total}</td> {/* Marks cell. */}
                    <td className="p-2 font-semibold">{g.grade || "-"}</td> {/* Grade cell. */}
                  </tr>
                ))}
                {filteredGrades.length === 0 && (
                  <tr> {/* Empty row. */}
                    <td colSpan={6} className="p-4 text-muted-foreground"> {/* Empty cell. */}
                      {loading ? "Loading..." : "No grades found"} {/* Empty message. */}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Subject-wise Grades by Exam (New System) */}
      {subjectGrades && subjectGrades.exams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Exam-wise Subject Grades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Detailed grades by exam. Click on an exam to expand and see subject-wise marks.
            </p>
            {subjectGrades.exams.map((examGrades) => {
              const isExpanded = expandedExams.has(examGrades.exam.id);
              const isSemester = isSemesterExam(examGrades.exam.code); // Check if semester exam.
              return (
                <div key={examGrades.exam.id} className="border rounded-lg">
                  {/* Exam Header - Clickable */}
                  <button
                    className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                    onClick={() => toggleExam(examGrades.exam.id)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-semibold">{examGrades.exam.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({examGrades.exam.code})
                      </span>
                      {/* Show "Grade Only" badge for semester exams. */}
                      {isSemester && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          Grade Only
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {examGrades.subjects.length} subject{examGrades.subjects.length !== 1 ? "s" : ""}
                    </span>
                  </button>

                  {/* Expanded Content - Subject Grades Table */}
                  {isExpanded && (
                    <div className="p-3 pt-0">
                      {/* Info banner for semester exams. */}
                      {isSemester && (
                        <p className="text-xs text-muted-foreground mb-2 italic">
                          Semester exams are graded directly; marks are not applicable.
                        </p>
                      )}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Code</th>
                            <th className="text-left p-2">Subject</th>
                            {/* Hide Marks column for semester exams. */}
                            {!isSemester && <th className="text-left p-2">Marks</th>}
                            <th className="text-left p-2">Grade</th>
                            <th className="text-left p-2">Comments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examGrades.subjects.map((sg) => (
                            <tr key={sg.subject.id} className="border-b">
                              <td className="p-2 font-mono text-xs">{sg.subject.code}</td>
                              <td className="p-2">{sg.subject.name}</td>
                              {/* Hide Marks cell for semester exams. */}
                              {!isSemester && (
                                <td className="p-2 font-semibold">{sg.marks ?? "-"}</td>
                              )}
                              <td className="p-2">
                                {sg.grade ? (
                                  <span className="px-2 py-0.5 bg-primary/10 rounded text-primary font-semibold text-xs">
                                    {sg.grade}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="p-2 text-muted-foreground text-xs max-w-xs truncate">
                                {sg.comments || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
