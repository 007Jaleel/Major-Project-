/**
 * StudentCourseShell.tsx - Main course view page with three-pane layout
 * Contains sidebar navigation and lesson content area
 */
import React, { useEffect } from 'react'; // Import React and hooks
import { useParams } from 'react-router-dom'; // Import routing hook
import { useCourseLessons, useLessonContent } from '../../hooks/useStudentCourse'; // Import custom hooks
import LessonContent from '../../components/student/LessonContent'; // Import lesson content component

/**
 * StudentCourseShell - Course detail page with lesson navigation
 * Sidebar shows sections/lessons, main area shows current lesson
 */
const StudentCourseShell: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>(); // Get courseId from URL
  const {
    courseData, // Course sections and lessons
    loading: courseLoading, // Loading state for course data
    error: courseError, // Error state for course data
    currentLessonId, // Currently selected lesson ID
    setCurrentLessonId, // Function to set current lesson
    goToNextLesson, // Function to navigate to next lesson
    goToPreviousLesson, // Function to navigate to previous lesson
    getCurrentLesson, // Function to get current lesson object
    refetch: refetchCourse, // Function to refetch course data
  } = useCourseLessons(); // Get course navigation state

  // Get current lesson object for display
  const currentLesson = getCurrentLesson(); // Get current lesson from hook

  // Handle lesson completion - refetch course data to update progress
  const handleLessonCompleted = () => {
    refetchCourse(); // Refetch to update completion status
  };

  // Handle navigation to next lesson
  const handleNextLesson = () => {
    goToNextLesson(); // Navigate to next lesson via hook
  };

  // Loading state
  if (courseLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        {/* Loading spinner */}
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0078D4] mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading course...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (courseError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-500 mb-4">{courseError}</p>
          <button
            onClick={refetchCourse}
            className="px-4 py-2 bg-[#0078D4] text-white rounded-lg hover:bg-[#106EBE] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No course data state
  if (!courseData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">Course not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main content area - renders current lesson */}
      <div className="flex-1 flex flex-col">
        {/* Lesson header with navigation */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Previous lesson button */}
            <button
              onClick={goToPreviousLesson}
              disabled={!currentLessonId || courseData.sections[0]?.lessons[0]?.id === currentLessonId}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            {/* Current lesson title */}
            <div className="text-center">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                {currentLesson?.title || 'Select a lesson'}
              </h2>
              {currentLesson && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {currentLesson.duration} min
                </p>
              )}
            </div>

            {/* Next lesson button */}
            <button
              onClick={goToNextLesson}
              disabled={!currentLessonId}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Lesson content */}
        <div className="flex-1 overflow-hidden">
          <LessonContent
            lessonId={currentLessonId} // Pass current lesson ID
            onCompleted={handleLessonCompleted} // Callback on completion
            onNext={handleNextLesson} // Callback to go to next lesson
          />
        </div>
      </div>
    </div>
  );
};

export default StudentCourseShell; // Export for routing in App.tsx