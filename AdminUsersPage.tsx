
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/apiClient"; // Import the new API client
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner"; // Import toast for notifications
import { GraduationCap, ArrowUpCircle, AlertTriangle, Undo2 } from "lucide-react"; // Icons for promotion UI

type UserRole = "student" | "teacher" | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: "active" | "inactive";
  className?: string;   // for students
  section?: string;     // for students
  rollNumber?: string;  // for students
  batch?: string;       // for students
  department?: string;  // for teachers
  subjectsTaught?: string[]; // for teachers
  lastLoginAt?: string;
}


export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("student");

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole>("student");

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Batch promotion state
  const [promoteSemester, setPromoteSemester] = useState<string>("1"); // Semester to promote
  const [promoting, setPromoting] = useState(false); // Loading state for promotion

  /**
   * Handle batch promotion, graduation, or reversion of students.
   * Calls POST /v1/admin/students/promote with currentSemester and action.
   * @param action - 'promote' or 'revert'
   */
  const handlePromoteBatch = async (action: 'promote' | 'revert') => {
    const semester = Number(promoteSemester); // Convert to number
    const isGraduation = semester === 6 && action === 'promote'; // Check if this is a graduation action
    const isUngraduation = semester === 6 && action === 'revert'; // Check if this is an ungraduation action

    // Build confirmation message based on action
    let actionText: string;
    if (action === 'promote') {
      actionText = isGraduation
        ? `Graduate all Semester 6 students? This will mark them as 'graduated' and they will no longer appear in active rosters.`
        : `Promote all Semester ${semester} students to Semester ${semester + 1}?`;
    } else {
      // Revert action
      if (semester === 1) {
        toast.error('Cannot revert Semester 1 students. No previous semester exists.'); // Show error toast
        return; // Exit early
      }
      actionText = isUngraduation
        ? `Restore all graduated Semester 6 students back to active status?`
        : `Revert all Semester ${semester} students back to Semester ${semester - 1}?`;
    }

    if (!confirm(actionText)) {
      return; // User cancelled
    }

    setPromoting(true); // Set loading state
    try {
      const res = await apiClient.post<{
        success: boolean;
        action: 'promoted' | 'graduated' | 'reverted' | 'ungraduated';
        updatedCount: number;
        message: string;
      }>('/v1/admin/students/promote', { currentSemester: semester, action });

      // Show success toast with count
      toast.success(res.data.message);
      setFetchTrigger(t => t + 1); // Refresh user list
    } catch (e: any) {
      console.error('Failed to process batch action', e);
      toast.error(e?.response?.data?.message || 'Failed to process batch action');
    } finally {
      setPromoting(false); // Clear loading state
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search: searchTerm,
      });
      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const res = await apiClient.get<{ data: User[], totalPages: number }>(`/admin/users?${params.toString()}`);
      setUsers(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch (e: any) {
      console.error('Failed to load users', e);
      setError(e?.response?.data?.error || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, roleFilter, statusFilter, page, fetchTrigger]);

  const handleCreate = async () => {
    setError("");
    setLoading(true);
    try {
      await apiClient.post("/admin/users", {
        name: newName,
        email: newEmail,
        role: newRole,
        status: "active", // Default status for new users
      });
      setNewName("");
      setNewEmail("");
      setNewRole("student");
      setFetchTrigger(t => t + 1); // Trigger a refetch
    } catch (e: any) {
      console.error('Failed to create user', e);
      setError(e?.response?.data?.error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    setError("");
    setLoading(true);
    try {
      await apiClient.delete(`/admin/users/${id}`);
      setFetchTrigger(t => t + 1); // Trigger a refetch
    } catch (e: any) {
      console.error('Failed to delete user', e);
      setError(e?.response?.data?.error || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const [editingUserDetail, setEditingUserDetail] = useState<User | null>(null);

  const fetchUserDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get<User>(`/admin/users/${id}`);
      setEditingUserDetail(res.data);
      setEditingRole(res.data.role);
    } catch (e: any) {
      console.error('Failed to load user details', e);
      setError(e?.response?.data?.error || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUserDetail) return;
    setError("");
    setLoading(true);
    try {
      await apiClient.put(`/admin/users/${editingUserDetail.id}`, {
        ...editingUserDetail,
        role: editingRole,
      });
      setEditingUser(null);
      setEditingUserDetail(null);
      setFetchTrigger(t => t + 1); // Trigger a refetch
    } catch (e: any) {
      console.error('Failed to update user', e);
      setError(e?.response?.data?.error || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (user: User, status: "active" | "inactive") => {
    setError("");
    setLoading(true);
    try {
      await apiClient.patch(`/admin/users/${user.id}/status`, { status });
      setFetchTrigger(t => t + 1); // Trigger a refetch
    } catch (e: any) {
      console.error('Failed to update user status', e);
      setError(e?.response?.data?.error || "Failed to update user status");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="w-1/3">
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Batch Promotion Card */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Batch Promotion / Graduation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Semester selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-amber-900">Target Semester</label>
              <Select value={promoteSemester} onValueChange={setPromoteSemester}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      Semester {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Two action buttons side-by-side */}
            <div className="flex gap-2">
              {/* Promote/Graduate button */}
              <Button
                variant={promoteSemester === "6" ? "destructive" : "default"}
                onClick={() => handlePromoteBatch('promote')}
                disabled={promoting}
                className="flex items-center gap-2"
              >
                {promoting ? (
                  "Processing..."
                ) : promoteSemester === "6" ? (
                  <>
                    <GraduationCap className="h-4 w-4" />
                    Graduate Batch
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="h-4 w-4" />
                    Promote to Sem {Number(promoteSemester) + 1}
                  </>
                )}
              </Button>

              {/* Undo/Revert button */}
              <Button
                variant="outline"
                onClick={() => handlePromoteBatch('revert')}
                disabled={promoting || promoteSemester === "1"}
                className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
              >
                {promoting ? (
                  "Processing..."
                ) : promoteSemester === "6" ? (
                  <>
                    <Undo2 className="h-4 w-4" />
                    Undo Graduation
                  </>
                ) : promoteSemester === "1" ? (
                  <>
                    <Undo2 className="h-4 w-4" />
                    Cannot Revert
                  </>
                ) : (
                  <>
                    <Undo2 className="h-4 w-4" />
                    Revert to Sem {Number(promoteSemester) - 1}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Dynamic warning text based on selected semester */}
          <div className="text-sm text-amber-700 p-3 bg-amber-100/50 rounded-lg">
            {promoteSemester === "6" ? (
              <div className="space-y-2">
                <p>
                  <strong>Promote (Graduate):</strong> All active Semester 6 students will be marked as "graduated".
                  They will no longer appear in active rosters, but their historical data will be preserved.
                </p>
                <p>
                  <strong>Undo Graduation:</strong> Restore graduated students back to active Semester 6 status.
                  Use this if graduation was applied accidentally.
                </p>
              </div>
            ) : promoteSemester === "1" ? (
              <div className="space-y-2">
                <p>
                  <strong>Promote:</strong> All active Semester 1 students will be moved to Semester 2.
                  This action affects all students in the selected semester.
                </p>
                <p className="text-red-600">
                  <strong>Note:</strong> Cannot revert Semester 1 students - there is no previous semester.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  <strong>Promote:</strong> All active Semester {promoteSemester} students will be moved to Semester {Number(promoteSemester) + 1}.
                </p>
                <p>
                  <strong>Revert:</strong> Undo a promotion - move Semester {promoteSemester} students back to Semester {Number(promoteSemester) - 1}.
                  Use this if a promotion was applied accidentally.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <label>Role:</label>
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <label>Status:</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700">{error}</div>
          )}

          <div className="border rounded-lg p-4 space-y-3">
            <div className="font-semibold">Add New User</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" />
              <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                <SelectTrigger className="w-45">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreate} disabled={loading || !newName.trim() || !newEmail.trim()}>
                {loading ? "Saving..." : "Create User"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Class Name</th>
                  <th className="text-left p-2">Section</th>
                  <th className="text-left p-2">Roll Number</th>
                  <th className="text-left p-2">Batch</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Last Login</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="p-2">{u.name}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.role}</td>
                    <td className="p-2">{u.status}</td>
                    <td className="p-2">{u.className || "-"}</td>
                    <td className="p-2">{u.section || "-"}</td>
                    <td className="p-2">{u.rollNumber || "-"}</td>
                    <td className="p-2">{u.batch || "-"}</td>
                    <td className="p-2">{u.department || "-"}</td>
                    <td className="p-2">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "-"}</td>
                    <td className="p-2 flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => {
                              fetchUserDetails(u.id);
                            }}
                            disabled={loading}
                          >
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User: {editingUserDetail?.name}</DialogTitle>
                            <DialogDescription>Update the user's details and permissions below.</DialogDescription>
                          </DialogHeader>
                          {editingUserDetail && (
                            <div className="space-y-4">
                              <Input
                                value={editingUserDetail.name}
                                onChange={(e) => setEditingUserDetail({ ...editingUserDetail, name: e.target.value })}
                                placeholder="Name"
                              />
                              <Input
                                value={editingUserDetail.email}
                                onChange={(e) => setEditingUserDetail({ ...editingUserDetail, email: e.target.value })}
                                placeholder="Email"
                              />
                              <Input
                                value={editingUserDetail.phone}
                                onChange={(e) => setEditingUserDetail({ ...editingUserDetail, phone: e.target.value })}
                                placeholder="Phone"
                              />
                              {editingUserDetail.role === 'student' && (
                                <>
                                  <Input
                                    value={editingUserDetail.className}
                                    onChange={(e) => setEditingUserDetail({ ...editingUserDetail, className: e.target.value })}
                                    placeholder="Class Name"
                                  />
                                  <Input
                                    value={editingUserDetail.section}
                                    onChange={(e) => setEditingUserDetail({ ...editingUserDetail, section: e.target.value })}
                                    placeholder="Section"
                                  />
                                  <Input
                                    value={editingUserDetail.rollNumber}
                                    onChange={(e) => setEditingUserDetail({ ...editingUserDetail, rollNumber: e.target.value })}
                                    placeholder="Roll Number"
                                  />
                                  <Input
                                    value={editingUserDetail.batch}
                                    onChange={(e) => setEditingUserDetail({ ...editingUserDetail, batch: e.target.value })}
                                    placeholder="Batch"
                                  />
                                </>
                              )}
                              {editingUserDetail.role === 'teacher' && (
                                <>
                                  <Input
                                    value={editingUserDetail.department}
                                    onChange={(e) => setEditingUserDetail({ ...editingUserDetail, department: e.target.value })}
                                    placeholder="Department"
                                  />
                                  <Input
                                    value={editingUserDetail.subjectsTaught?.join(', ')}
                                    onChange={(e) => setEditingUserDetail({ ...editingUserDetail, subjectsTaught: e.target.value.split(',').map(s => s.trim()) })}
                                    placeholder="Subjects Taught (comma-separated)"
                                  />
                                </>
                              )}
                              <Select value={editingRole} onValueChange={(value) => setEditingRole(value as UserRole)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="student">Student</SelectItem>
                                  <SelectItem value="teacher">Teacher</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={editingUserDetail.status} onValueChange={(value) => setEditingUserDetail({ ...editingUserDetail, status: value as "active" | "inactive" })}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button onClick={handleUpdateUser} disabled={loading}>
                                {loading ? "Saving..." : "Save Changes"}
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant={u.status === 'active' ? 'secondary' : 'default'}
                        onClick={() => handleStatusChange(u, u.status === 'active' ? 'inactive' : 'active')}
                        disabled={loading}
                      >
                        {u.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(u.id)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td className="p-4 text-muted-foreground" colSpan={10}>
                      {loading ? "Loading..." : "No users found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end items-center space-x-4">
            <span>Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
