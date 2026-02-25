/**
 * Attendance.tsx - Attendance view (route: /attendance)
 * Displays subject-wise attendance with semester filter and pulls data from backend.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, TrendingUp, AlertCircle, CheckCircle2, Home } from "lucide-react";
import apiClient from "@/lib/apiClient"; // Import apiClient instead of axios - includes auth token in requests.
import AttendanceTrendChart, { AttendanceTrendPoint } from "../../components/attendance/AttendanceTrendChart"; // Import reusable attendance trend chart.

const Attendance: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("2026-02-04"); // Track selected date input.
  const [selectedSemester, setSelectedSemester] = useState<number>(1); // Track selected semester.
  const [loading, setLoading] = useState(false); // Track loading.
  const [error, setError] = useState(""); // Track error message.

  const roll = useMemo(() => {
    return (
      localStorage.getItem("roll") ||
      localStorage.getItem("admissionNo") ||
      ""
    );
  }, []);

  const [subjectWise, setSubjectWise] = useState<
    { course_id: number; code: string; name: string; branch: string; semester: number; total: number; present: number }[]
  >([]);

  const [records, setRecords] = useState<
    { id: number; date: string; status: string; code: string; name: string; semester: number }[]
  >([]);

  const normalizeStatus = (status: string) => { // Normalize DB status strings to UI-friendly labels.
    const normalized = String(status || "").trim().toUpperCase(); // Convert status to uppercase.
    if (normalized === "PRESENT") return "Present"; // Map PRESENT to Present.
    if (normalized === "ABSENT") return "Absent"; // Map ABSENT to Absent.
    return normalized || "-"; // Fall back to raw status.
  }; 

  const fetchAttendance = async () => {
    if (!roll) {
      setError("Missing roll/admission number. Please login again.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Use apiClient (includes auth token) and remove /api prefix since apiClient.baseURL already adds it.
      const summaryRes = await apiClient.get(`/v1/students/${roll}/attendance/summary`, { timeout: 30000 });
      setSubjectWise(summaryRes.data?.subjectWise || []);

      const recordsRes = await apiClient.get(`/v1/students/${roll}/attendance`, {
        params: { semester: selectedSemester },
        timeout: 30000,
      });
      setRecords(recordsRes.data || []);
    } catch (e: any) {
      console.error("Failed to fetch attendance:", e);
      setError("Failed to load attendance. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemester]);

  const courseList = useMemo(() => {
    return subjectWise
      .filter((s) => Number(s.semester) === Number(selectedSemester))
      .map((s) => ({ name: s.name, attended: Number(s.present || 0), total: Number(s.total || 0) }));
  }, [subjectWise, selectedSemester]);

  const overallPercentage = useMemo(() => {
    const attended = courseList.reduce((a, c) => a + c.attended, 0);
    const total = courseList.reduce((a, c) => a + c.total, 0);
    if (total === 0) return 0;
    return Math.round((attended / total) * 100);
  }, [courseList]);

  const trendData: AttendanceTrendPoint[] = useMemo(() => { // Build trend data for the area chart.
    const months: AttendanceTrendPoint[] = [ // Define a simple month-based timeline (placeholder until backend provides trend endpoint).
      { label: "Aug", attendance: Math.min(100, Math.max(0, overallPercentage + 4)) }, // Provide a synthetic value around overall.
      { label: "Sep", attendance: Math.min(100, Math.max(0, overallPercentage + 2)) }, // Provide a synthetic value around overall.
      { label: "Oct", attendance: Math.min(100, Math.max(0, overallPercentage + 1)) }, // Provide a synthetic value around overall.
      { label: "Nov", attendance: Math.min(100, Math.max(0, overallPercentage - 1)) }, // Provide a synthetic value around overall.
      { label: "Dec", attendance: Math.min(100, Math.max(0, overallPercentage)) }, // Provide a synthetic value around overall.
    ];
    return months; // Return array for chart input.
  }, [overallPercentage]);

  const exportCSV = () => {
    const header = ["Date", "Subject", "Status", "Semester"]; // Define CSV header.
    const rows = records.map((r) => [r.date, r.name, r.status, String(r.semester)]); // Build CSV rows.
    const csvContent = [header, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-card/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Attendance Details</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 text-foreground border border-border rounded-lg hover:bg-background transition-colors"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-6 p-3 rounded border border-red-200 bg-red-50 text-red-700 flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={fetchAttendance}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <div className="card mb-6"> {/* Semester selector card. */}
          <div className="flex items-center justify-between gap-4 flex-wrap"> {/* Row. */}
            <div> {/* Left section. */}
              <h3 className="text-lg font-bold text-foreground">Semester</h3> {/* Heading. */}
              <p className="text-sm text-muted-foreground">Select semester to view subject-wise attendance</p> {/* Subtext. */}
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm" // Select style.
              value={selectedSemester} // Bind selected semester.
              onChange={(e) => setSelectedSemester(Number(e.target.value))} // Update semester.
              disabled={loading} // Disable while loading.
            >
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <option key={s} value={s}>{`Semester ${s}`}</option> // Semester options.
              ))}
            </select>
          </div>
        </div>
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Overall Attendance */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Overall Attendance</h3>
              {overallPercentage >= 75 ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className={`text-4xl font-bold mb-2 ${overallPercentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
              {overallPercentage}%
            </p>
            <p className="text-xs text-gray-500">
              {overallPercentage >= 75 ? '✓ Meets minimum requirement' : '✗ Below 75% minimum'}
            </p>
          </div>

          {/* Classes Attended */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Classes Attended</h3>
            <p className="text-4xl font-bold mb-2 text-primary">
              {courseList.reduce((a, c) => a + c.attended, 0)}
            </p>
            <p className="text-xs text-gray-500">
              out of {courseList.reduce((a, c) => a + c.total, 0)} classes
            </p>
          </div>

          {/* Required Classes */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-4">To Maintain 75%</h3>
            <p className="text-4xl font-bold mb-2 text-secondary">
              {Math.ceil(courseList.reduce((a, c) => a + c.total, 0) * 0.75 - courseList.reduce((a, c) => a + c.attended, 0))}
            </p>
            <p className="text-xs text-gray-500">more classes required</p>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="card mb-12"> {/* Chart container card. */}
          <div className="flex items-center justify-between mb-6"> {/* Card header row. */}
            <h2 className="text-2xl font-bold text-foreground">Attendance Trend</h2> {/* Chart title. */}
            <p className="text-sm text-muted-foreground">Monthly view (demo trend)</p> {/* Subtitle to clarify data source. */}
          </div>
          <AttendanceTrendChart data={trendData} height={220} /> {/* Render the reusable Recharts area chart. */}
        </div>

        {/* Course-wise Attendance */}
        <div className="card mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Course-wise Attendance
            </h2>
            <button 
              onClick={exportCSV}
              className="text-sm text-primary hover:text-primary-dark transition-colors"
            >
              Download Report
            </button>
          </div>

          <div className="space-y-3">
            {courseList.map((course) => {
              const percentage = course.total > 0 ? Math.round((course.attended / course.total) * 100) : 0;
              const isAboveThreshold = percentage >= 75;
              
              return (
                <div key={course.name} className="p-4 rounded-lg bg-background hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{course.name}</p>
                      <p className="text-sm text-gray-500">{course.attended} / {course.total} classes</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      isAboveThreshold 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    }`}>
                      {percentage}%
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        isAboveThreshold 
                          ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                          : 'bg-gradient-to-r from-orange-400 to-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Records */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar View */}
          <div className="card">
            <h3 className="text-lg font-bold text-foreground mb-4">Select Date</h3>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Statistics */}
          <div className="card">
            <h3 className="text-lg font-bold text-foreground mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Classes</span>
                <span className="font-semibold text-foreground">{courseList.reduce((a, c) => a + c.total, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Classes Attended</span>
                <span className="font-semibold text-green-600">{courseList.reduce((a, c) => a + c.attended, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Classes Missed</span>
                <span className="font-semibold text-red-600">
                  {courseList.reduce((a, c) => a + (c.total - c.attended), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Records Table */}
        <div className="card mt-6">
          <h3 className="text-lg font-bold text-foreground mb-6">Recent Attendance Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Subject</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? (
                  records.map((record, idx) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-background transition-colors">
                      <td className="px-4 py-3 text-foreground">{record.date}</td>
                      <td className="px-4 py-3 text-foreground">{record.name}</td>
                      <td className="px-4 py-3">
                        {normalizeStatus(record.status) === "Present" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                            <CheckCircle2 className="w-4 h-4" />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                            <AlertCircle className="w-4 h-4" />
                            Absent
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Attendance;
