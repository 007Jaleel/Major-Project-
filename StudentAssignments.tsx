import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockStudentAssignments } from "@/lib/mock-data"; // Import mock data
import { format, isPast, differenceInDays } from "date-fns";
import { Clock, CheckCircle, AlertCircle, FileText, ArrowRight } from "lucide-react";

export default function StudentAssignments() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "graded">("all");

  const [assignments, setAssignments] = useState(mockStudentAssignments); // Use mock data
  const isLoading = false; // Set isLoading to false for mock data

  const filteredAssignments = assignments?.filter((a) => {
    if (filter === "all") return true;
    // Add filter logic based on submission status
    return true;
  }) || [];

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    return new Date(a.assignment?.dueDate || new Date()).getTime() - new Date(b.assignment?.dueDate || new Date()).getTime();
  });

  const getStatusIcon = (assignment: any) => {
    const isOverdue = isPast(new Date(assignment.assignment?.dueDate || new Date()));
    const daysUntilDue = differenceInDays(new Date(assignment.assignment?.dueDate || new Date()), new Date());

    if (isOverdue) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    } else if (daysUntilDue <= 2) {
      return <Clock className="w-5 h-5 text-orange-500" />;
    } else {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusBadge = (assignment: any) => {
    const isOverdue = isPast(new Date(assignment.assignment?.dueDate || new Date()));
    const daysUntilDue = differenceInDays(new Date(assignment.assignment?.dueDate || new Date()), new Date());

    if (isOverdue) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Overdue</Badge>;
    } else if (daysUntilDue <= 2) {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Due Soon</Badge>;
    } else if (daysUntilDue <= 7) {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">This Week</Badge>;
    } else {
      return <Badge variant="outline">Upcoming</Badge>;
    }
  };

  if (isLoading) {
    return (
        <div className="space-y-6">
          <div className="h-12 bg-muted rounded-lg animate-pulse"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">My Assignments</h1>
          <p className="text-muted-foreground">Track and submit your assignments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="card-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{assignments?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Assigned to you</p>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-500">
                {assignments?.filter((a) => isPast(new Date(a.assignment?.dueDate || new Date()))).length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Not submitted</p>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Due Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">
                {assignments?.filter((a) => {
                  const daysUntil = differenceInDays(new Date(a.assignment?.dueDate || new Date()), new Date());
                  return daysUntil <= 3 && daysUntil > 0;
                }).length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Next 3 days</p>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Grade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-500">87%</div>
              <p className="text-xs text-muted-foreground mt-1">On graded work</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "submitted", "graded"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        {/* Assignments List */}
        <div className="space-y-3">
          {sortedAssignments.length === 0 ? (
            <Card className="card-elegant">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">No assignments to display</p>
              </CardContent>
            </Card>
          ) : (
            sortedAssignments.map((assignment) => (
              <Card key={assignment.assignment?.id} className="card-elegant hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(assignment)}
                        <h3 className="text-lg font-semibold">{assignment.assignment?.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{assignment.assignment?.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                          <p className="text-sm font-medium">
                            {format(new Date(assignment.assignment?.dueDate || new Date()), "MMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isPast(new Date(assignment.assignment?.dueDate || new Date()))
                              ? "Overdue"
                              : `${differenceInDays(new Date(assignment.assignment?.dueDate || new Date()), new Date())} days left`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Max Score</p>
                          <p className="text-sm font-medium">{assignment.assignment?.maxScore} points</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Class</p>
                          <p className="text-sm font-medium">{assignment.class?.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Status</p>
                          {getStatusBadge(assignment)}
                        </div>
                      </div>
                    </div>

                    <Button className="btn-primary gap-2 whitespace-nowrap">
                      Submit
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
  );
}
