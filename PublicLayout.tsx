/**
 * PublicLayout.tsx - A layout for public-facing pages
 * Contains the top navigation bar.
 */
import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Menu } from "lucide-react"; // Added Menu icon
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Added Sheet components

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const getLoginUrl = () => "/login";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar: logo and Sign In button */}
      <nav className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            {/* Mobile Menu (Hamburger) */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <Link to="/" className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold gradient-text">EduConnect</span>
                </Link>
                <div className="flex flex-col gap-2">
                  <Link to="/" className="text-lg font-medium hover:underline">Home</Link>
                  <Link to="/public-settings" className="text-lg font-medium hover:underline">Settings</Link>
                  <Button onClick={() => (window.location.href = getLoginUrl())} className="w-full mt-4">
                    Sign In
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* EduConnect Logo for Desktop */}
            <Link to="/" className="hidden md:flex items-center gap-2 font-semibold">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">EduConnect</span>
            </Link>

            {/* Desktop Navigation links */}
            <nav className="hidden md:flex items-center space-x-4">
              <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">Home</Link>
              <Link to="/public-settings" className="text-sm font-medium transition-colors hover:text-primary">Settings</Link>
            </nav>
          </div>
          {/* Sign In button for Desktop */}
          <Button onClick={() => (window.location.href = getLoginUrl())} className="btn-primary hidden md:block">
            Sign In
          </Button>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
};

export default PublicLayout;
