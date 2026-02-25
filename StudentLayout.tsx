/**
 * StudentLayout.tsx - Layout wrapper for student course pages
 * Contains StudentTopBar (full-width) and main content area
 * Sidebar is rendered directly in the course shell for simplicity
 */
import React, { useState, useEffect } from 'react'; // Import React hooks
import { Outlet, useParams } from 'react-router-dom'; // Import routing components
import StudentTopBar from '../components/student/StudentTopBar'; // Import top bar component
import SidebarCourseNav from '../components/student/SidebarCourseNav'; // Import sidebar navigation

/**
 * StudentLayout - Two-pane layout for student course/lesson pages
 * TopBar spans full width, with sidebar + content below
 */
const StudentLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for mobile sidebar visibility
  const { courseId } = useParams<{ courseId: string }>(); // Get courseId from URL if present

  // Toggle mobile menu open/closed
  const handleMenuClick = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen); // Flip the current state
  };

  // Close mobile menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      // If window width is >= 1024px (lg breakpoint), close mobile menu
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize); // Add resize listener
    return () => window.removeEventListener('resize', handleResize); // Cleanup on unmount
  }, []);

  return (
    // Full-height container with flex column layout
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Full-width top bar - fixed at top */}
      <StudentTopBar
        onMenuClick={handleMenuClick} // Pass menu toggle function
        isMobileMenuOpen={isMobileMenuOpen} // Pass current menu state
      />

      {/* Main content area below top bar */}
      <div className="flex flex-1 pt-14">
        {/* pt-14 = padding-top: 3.5rem (56px) to clear fixed header */}

        {/* Mobile overlay - visible when mobile menu is open */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden" // Semi-transparent backdrop
            onClick={() => setIsMobileMenuOpen(false)} // Close menu when clicking overlay
          />
        )}

        {/* Sidebar - only show when inside a course (courseId present) */}
        {courseId && (
          <aside
            className={`
              fixed lg:static inset-y-0 left-0 z-40
              w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
              transform transition-transform duration-300 ease-in-out
              pt-14 lg:pt-0 lg:transform-none flex flex-col
              ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
          >
            {/* Sidebar navigation component - gets courseId from URL via hook */}
            <SidebarCourseNav
              onLessonSelect={() => setIsMobileMenuOpen(false)} // Close mobile menu on lesson select
            />
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          {/* Main content rendered by nested routes */}
          <Outlet /> {/* Outlet for page content */}
        </main>
      </div>
    </div>
  );
};

export default StudentLayout; // Export for use in App.tsx routing