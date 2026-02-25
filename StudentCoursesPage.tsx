/**
 * StudentCoursesPage.tsx - Page showing all enrolled courses for a student
 * Displays progress stats and a grid of course cards
 */
import React from 'react'; // Import React
import { useNavigate } from 'react-router-dom'; // Import routing hook
import { useStudentCourses, StudentCourse } from '../../hooks/useStudentCourse'; // Import hook and types

/**
 * StudentCoursesPage - Displays enrolled courses with progress tracking
 * Shows stats summary and course card grid
 */
const StudentCoursesPage: React.FC = () => {
  const navigate = useNavigate(); // Get navigate function for routing
  const { courses, loading, error, refetch } = useStudentCourses(); // Fetch courses via hook

  // Calculate summary statistics
  const totalCourses = courses.length; // Total number of enrolled courses
  const totalLessons = courses.reduce((sum, c) => sum + c.total_lessons, 0); // Sum of all lessons
  const completedLessons = courses.reduce((sum, c) => sum + c.completed_lessons, 0); // Sum of completed lessons
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0; // Overall percentage

  // Handle clicking on a course card
  const handleCourseClick = (courseId: number) => {
    navigate(`/student/courses/${courseId}`); // Navigate to course detail page
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        {/* Skeleton loading for stats */}
        <div className="animate-pulse mb-8">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
        {/* Skeleton loading for course cards */}
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-[#0078D4] text-white rounded-lg hover:bg-[#106EBE] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No courses state
  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Courses Yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You haven't been enrolled in any courses yet. Contact your administrator.
          </p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-4 py-2 bg-[#0078D4] text-white rounded-lg hover:bg-[#106EBE] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          My Courses
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Continue learning from where you left off
        </p>
      </div>

      {/* Progress stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total courses stat */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#0078D4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Courses</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalCourses}</p>
            </div>
          </div>
        </div>

        {/* Total lessons stat */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Lessons</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalLessons}</p>
            </div>
          </div>
        </div>

        {/* Completed lessons stat */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{completedLessons}</p>
            </div>
          </div>
        </div>

        {/* Overall progress stat */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{overallProgress}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course: StudentCourse) => (
          <div
            key={course.id}
            onClick={() => handleCourseClick(course.id)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md hover:border-[#0078D4] transition-all group"
          >
            {/* Course header with gradient */}
            <div className="h-24 bg-gradient-to-br from-[#0078D4] to-[#106EBE] relative">
              {/* Course code badge */}
              <div className="absolute top-3 left-3 px-2 py-1 bg-white/20 rounded text-white text-xs font-medium">
                {course.code}
              </div>
              {/* Semester badge */}
              <div className="absolute top-3 right-3 px-2 py-1 bg-white/20 rounded text-white text-xs">
                Sem {course.semester}
              </div>
            </div>

            {/* Course content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-[#0078D4] transition-colors">
                {course.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {course.teacher_name || 'No teacher assigned'}
              </p>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{course.completed_lessons} of {course.total_lessons} lessons</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0078D4] transition-all duration-300"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>

              {/* Continue button */}
              <div className="mt-3 flex items-center text-sm text-[#0078D4] font-medium">
                <span>{course.progress > 0 ? 'Continue Learning' : 'Start Course'}</span>
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentCoursesPage; // Export for routing in App.tsx