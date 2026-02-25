/**
 * AdminDashboard.tsx - Admin landing page with Current Class Widget
 * Displays the current class context based on live clock and timetables.
 * Provides quick access to mark attendance for the active class.
 * Prototype: Admin acts as teacher for all timetable blocks.
 */
import React from 'react'; // React hooks for state and side effects
import { useNavigate } from 'react-router-dom'; // Navigation hook for routing
import { Card, CardContent } from '@/components/ui/card'; // Card components for layout
import { Calendar, Clock, BookOpen, Users, Settings } from 'lucide-react'; // Icons for visual elements
import { useAuth } from '@/hooks/useAuth'; // Auth hook for user context
import { CurrentClassWidget } from '@/pages/dashboard/TeacherDashboard'; // Reuse widget from TeacherDashboard

/**
 * AdminDashboard - Main dashboard for admin users
 * Shows current class widget and quick links.
 * In prototype mode, admin acts as the teacher for all classes.
 */
export default function AdminDashboard() {
  const { user } = useAuth(); // Get current user from auth context
  const navigate = useNavigate(); // Navigation hook for routing

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || 'Admin'}! 
            <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">
              Prototype Mode
            </span>
          </p>
        </div>
      </div>

      {/* Current Class Widget - Main Feature (at the very top) */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" /> {/* Clock icon */}
          Your Current Class
        </h2>
        <CurrentClassWidget />
      </section>

      {/* Quick Links - Admin specific */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/attendance')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Attendance</h3>
                <p className="text-sm text-muted-foreground">Mark and manage attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/timetable')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">Timetable</h3>
                <p className="text-sm text-muted-foreground">Manage class schedules</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/users')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">Users</h3>
                <p className="text-sm text-muted-foreground">Manage user accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}