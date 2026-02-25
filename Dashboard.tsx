/**
 * Dashboard.tsx - Generic dashboard (route: /dashboard)
 * Shows stat cards (Attendance, CGPA, Courses), quick links, and logout. Used when role is unknown or legacy.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, LogOut, BarChart3, BookOpen, Award, Settings } from 'lucide-react';

// A simple hash function to create a consistent "random" value from a string.
const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export default function Dashboard() {
  const navigate = useNavigate();

  const stats = [
    { label: 'Attendance', value: '85%', icon: BookOpen, color: 'from-primary to-secondary' },
    { label: 'CGPA', value: '8.5', icon: Award, color: 'from-secondary to-accent' },
    { label: 'Courses', value: '6', icon: BarChart3, color: 'from-accent to-primary' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-card/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold">E</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">EduConnect</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-3">
            Welcome, <span className="text-gradient">Student</span>
          </h2>
          <p className="text-gray-500">Here's your academic overview and quick actions</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="card group hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Academic Overview */}
            <div className="card">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Academic Overview
              </h3>
              <div className="space-y-4">
                {['Mathematics', 'Physics', 'Chemistry', 'Programming', 'Database', 'Web Dev'].map((course, idx) => {
                  const hash = simpleHash(course);
                  const percentage = 70 + (hash % 30);
                  const grade = 75 + (hash % 20);

                  return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <span className="font-medium text-foreground">{course}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-primary min-w-[3rem]">{grade}%</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activities */}
            <div className="card">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-secondary" />
                Recent Activities
              </h3>
              <div className="space-y-3">
                {[
                  { date: '2 hours ago', event: 'Attendance marked for Mathematics' },
                  { date: '1 day ago', event: 'New announcement: Mid-term exam schedule' },
                  { date: '2 days ago', event: 'Grade uploaded for Quiz 3' },
                  { date: '3 days ago', event: 'Certificate of achievement awarded' },
                ].map((activity, idx) => (
                  <div key={idx} className="flex gap-4 p-3 rounded-lg bg-background hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="w-2 h-auto bg-gradient-to-b from-primary to-secondary rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{activity.event}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => navigate('/attendance')}
                  className="w-full p-3 rounded-lg text-left font-medium text-foreground bg-background hover:bg-primary/10 transition-all hover:text-primary"
                >
                  View Attendance
                </button>
                <button
                  onClick={() => navigate('/hall-ticket')}
                  className="w-full p-3 rounded-lg text-left font-medium text-foreground bg-background hover:bg-secondary/10 transition-all hover:text-secondary"
                >
                  Download Hall Ticket
                </button>
                <button
                  onClick={() => navigate('/certificates')}
                  className="w-full p-3 rounded-lg text-left font-medium text-foreground bg-background hover:bg-accent/10 transition-all hover:text-accent"
                >
                  View Certificates
                </button>
              </div>
            </div>

            {/* Profile Card */}
            <div className="card">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                  S
                </div>
                <div>
                  <p className="font-semibold text-foreground">Student Name</p>
                  <p className="text-sm text-gray-500">KTU23CS001</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="w-full p-2.5 flex items-center justify-center gap-2 rounded-lg border border-border hover:bg-background transition-colors font-medium text-foreground"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>

            {/* Upcoming Events */}
            <div className="card">
              <h3 className="text-lg font-bold text-foreground mb-4">Upcoming</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Mid-term Exams</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Feb 15 - Feb 28</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-200">Project Submission</p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">Feb 25</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
