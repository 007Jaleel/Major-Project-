/**
 * AdminClasses.tsx - Admin page for managing classes and their materials
 * Allows admin to create classes and manage study materials (PDF, PPT, Quiz, Game, Video, Document, Other)
 * per class with CRUD operations and publish/unpublish functionality.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import navigation hook for routing
import apiClient from '@/lib/apiClient'; // Import apiClient for API calls
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, PlusCircle, FileText, Edit, Trash2, Eye, EyeOff, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth hook for getting current user
import { Badge } from '@/components/ui/badge'; // Import Badge for material type display
import { Switch } from '@/components/ui/switch'; // Import Switch for publish toggle
import { toast } from 'sonner'; // Import toast for notifications

/**
 * Interface for Class object
 * Represents a class entity with all its properties
 */
interface Class {
  id: number; // Unique class identifier
  code: string; // Class code (e.g., CS101)
  name: string; // Class name
  semester: number; // Semester number (1-6)
  department: string; // Department name
  teacher_name: string; // Name of the teacher
  schedule: string; // Class schedule
  room: string; // Room number
  subject_id?: number; // Optional subject ID
  subject_name?: string; // Optional subject name
  subject_code?: string; // Optional subject code
  created_by: number; // ID of admin who created the class
  created_at: string; // Creation timestamp
}

/**
 * Interface for Subject object
 * Represents a subject that can be linked to a class
 */
interface Subject {
  id: number; // Unique subject identifier
  code: string; // Subject code
  name: string; // Subject name
  credits: number; // Number of credits
  branch: string; // Branch (CT, EC, MECH)
  semester: number; // Semester number
}

/**
 * Material type enum - matches backend ENUM
 * Defines all possible types of study materials
 */
type MaterialType = 'pdf' | 'ppt' | 'quiz' | 'game' | 'video' | 'document' | 'other';

/**
 * Interface for Material object
 * Represents a study material attached to a class
 */
interface Material {
  id: number; // Unique material identifier
  class_id: number; // ID of the class this material belongs to
  type: MaterialType; // Type of material (pdf, ppt, quiz, etc.)
  title: string; // Material title
  description?: string; // Optional description
  file_url: string; // URL or path to the file
  file_size?: number; // File size in bytes
  uploaded_by?: number; // ID of admin who uploaded
  is_published: boolean; // Whether visible to students
  order: number; // Display order within class
  created_at: string; // Creation timestamp
  updated_at: string; // Last update timestamp
}

/**
 * Zod schema for class form validation
 * Validates all required fields for creating a new class
 */
const formSchema = z.object({
  code: z.string().min(1, { message: "Code is required." }), // Class code is required
  name: z.string().min(1, { message: "Name is required." }), // Class name is required
  semester: z.string().refine(val => { // Semester must be 1-6
    const num = Number(val);
    return num >= 1 && num <= 6;
  }, { message: "Semester must be between 1 and 6." }),
  department: z.string().min(1, { message: "Department is required." }), // Department is required
  teacher_name: z.string().min(1, { message: "Teacher Name is required." }), // Teacher name is required
  schedule: z.string().min(1, { message: "Schedule is required." }), // Schedule is required
  room: z.string().min(1, { message: "Room is required." }), // Room is required
  subject_id: z.string().optional(), // Subject is optional
});

/**
 * Zod schema for material form validation
 * Validates all fields for creating/editing a material
 */
const materialFormSchema = z.object({
  type: z.enum(['pdf', 'ppt', 'quiz', 'game', 'video', 'document', 'other']), // Material type
  title: z.string().min(1, { message: "Title is required." }), // Title is required
  description: z.string().optional(), // Description is optional
  file_url: z.string().min(1, { message: "File URL is required." }), // File URL is required
  is_published: z.boolean().optional(), // Published status - optional, default set in form
});

/**
 * AdminClasses component - Main component for class and material management
 * Provides CRUD operations for classes and their associated materials
 */
export default function AdminClasses() {
  const { user } = useAuth(); // Get current user for authentication context
  const navigate = useNavigate(); // Navigation hook for routing to class editor
  
  // State for class list and filters
  const [semesterFilter, setSemesterFilter] = useState<string>(''); // Semester filter value
  const [departmentFilter, setDepartmentFilter] = useState<string>(''); // Department filter value
  const [classes, setClasses] = useState<Class[]>([]); // Array of classes
  const [loading, setLoading] = useState<boolean>(false); // Loading state for classes
  const [error, setError] = useState<string>(''); // Error message
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState<boolean>(false); // Add class dialog state
  const [subjects, setSubjects] = useState<Subject[]>([]); // Array of subjects for dropdown
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(false); // Loading state for subjects
  
  // State for materials management
  const [selectedClass, setSelectedClass] = useState<Class | null>(null); // Currently selected class for materials
  const [materials, setMaterials] = useState<Material[]>([]); // Array of materials for selected class
  const [materialsLoading, setMaterialsLoading] = useState<boolean>(false); // Loading state for materials
  const [isMaterialsDialogOpen, setIsMaterialsDialogOpen] = useState<boolean>(false); // Materials dialog state
  const [isAddMaterialDialogOpen, setIsAddMaterialDialogOpen] = useState<boolean>(false); // Add material dialog state
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null); // Material being edited

  /**
   * Form hook for class creation
   * Uses react-hook-form with zod validation
   */
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema), // Use zod for validation
    defaultValues: {
      code: '',
      name: '',
      semester: '',
      department: '',
      teacher_name: '',
      schedule: '',
      room: '',
    },
  });

  /**
   * Form hook for material creation/editing
   * Uses react-hook-form with zod validation
   */
  const materialForm = useForm<z.infer<typeof materialFormSchema>>({
    resolver: zodResolver(materialFormSchema), // Use zod for validation
    defaultValues: {
      type: 'pdf',
      title: '',
      description: '',
      file_url: '',
      is_published: false,
    },
  });

  /**
   * Fetches classes from the API with optional filters
   * Handles authentication and error states
   */
  const fetchClasses = async () => {
    setLoading(true); // Set loading state to true
    setError(''); // Clear any previous error
    
    // Check if user is authenticated before making API call
    const token = localStorage.getItem('authToken'); // Get auth token from localStorage
    if (!token) {
      setError('Authentication required. Please log in to view classes.'); // Set authentication error
      setLoading(false); // Set loading state to false
      setClasses([]); // Clear classes
      return; // Exit early if no token
    }
    
    try {
      const params = new URLSearchParams(); // Create URL search params object
      if (semesterFilter) params.append('semester', semesterFilter); // Add semester filter if present
      if (departmentFilter) params.append('department', departmentFilter); // Add department filter if present

      const response = await apiClient.get<Class[]>(`/v1/classes?${params.toString()}`); // Make API call
      setClasses(response.data); // Update classes state with response data
      console.log(`Fetched ${response.data.length} classes`); // Log number of classes fetched
    } catch (err: any) {
      console.error('Failed to fetch classes:', err); // Log error to console
      
      // Check for authentication errors
      if (err?.response?.status === 401 || err?.response?.data?.message?.includes('token')) {
        setError('Authentication failed. Please log in again to view classes.'); // Set auth error message
      } else {
        setError(err?.response?.data?.message || 'Failed to fetch classes. Please try again.'); // Set generic error message
      }
      setClasses([]); // Clear classes on error
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  /**
   * Handles class form submission
   * Creates a new class via API
   */
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!user?.id) { // Check if user is authenticated
        setError('User not authenticated to create class.');
        return;
      }
      await apiClient.post('/v1/classes', { // POST request to create class
        ...values,
        semester: Number(values.semester), // Convert semester to number
        created_by: user.id, // Set creator ID
      });
      form.reset(); // Reset form after successful creation
      setIsAddClassDialogOpen(false); // Close dialog
      fetchClasses(); // Refresh class list
      toast.success('Class created successfully'); // Show success toast
    } catch (err) {
      console.error('Failed to add class:', err);
      setError('Failed to add class.');
      toast.error('Failed to create class'); // Show error toast
    }
  };

  /**
   * Fetches materials for a specific class
   * @param classId - ID of the class to fetch materials for
   */
  const fetchMaterials = async (classId: number) => {
    setMaterialsLoading(true); // Set loading state
    try {
      const response = await apiClient.get<Material[]>(`/v1/classes/${classId}/materials`); // Fetch materials
      setMaterials(response.data); // Update materials state
    } catch (err) {
      console.error('Failed to fetch materials:', err);
      toast.error('Failed to fetch materials'); // Show error toast
      setMaterials([]); // Clear materials on error
    } finally {
      setMaterialsLoading(false); // Clear loading state
    }
  };

  /**
   * Opens materials dialog for a class
   * @param cls - Class object to manage materials for
   */
  const openMaterialsDialog = (cls: Class) => {
    setSelectedClass(cls); // Set selected class
    setIsMaterialsDialogOpen(true); // Open materials dialog
    fetchMaterials(cls.id); // Fetch materials for the class
  };

  /**
   * Navigate to the class editor page for managing lessons and materials
   * This matches the behavior of the "Manage Materials" button in AdminCourses (subjects page)
   * @param cls - Class object to navigate to editor for
   */
  const handleManageMaterials = (cls: Class) => {
    navigate(`/admin/classes/${cls.id}/editor`); // Navigate to class editor page
  };

  /**
   * Opens add material dialog
   * Resets form and sets dialog state
   */
  const openAddMaterialDialog = () => {
    setEditingMaterial(null); // Clear editing state
    materialForm.reset({ // Reset form to default values
      type: 'pdf',
      title: '',
      description: '',
      file_url: '',
      is_published: false,
    });
    setIsAddMaterialDialogOpen(true); // Open add material dialog
  };

  /**
   * Opens edit material dialog
   * @param material - Material object to edit
   */
  const openEditMaterialDialog = (material: Material) => {
    setEditingMaterial(material); // Set material being edited
    materialForm.reset({ // Populate form with material data
      type: material.type,
      title: material.title,
      description: material.description || '',
      file_url: material.file_url,
      is_published: material.is_published,
    });
    setIsAddMaterialDialogOpen(true); // Open dialog
  };

  /**
   * Handles material form submission (create or update)
   * @param values - Form values from material form
   */
  const onMaterialSubmit = async (values: z.infer<typeof materialFormSchema>) => {
    if (!selectedClass) return; // Exit if no class selected
    
    try {
      if (editingMaterial) {
        // Update existing material
        await apiClient.put(`/v1/classes/${selectedClass.id}/materials/${editingMaterial.id}`, values);
        toast.success('Material updated successfully'); // Show success toast
      } else {
        // Create new material
        await apiClient.post(`/v1/classes/${selectedClass.id}/materials`, {
          ...values,
          uploaded_by: user?.id, // Set uploader ID
        });
        toast.success('Material created successfully'); // Show success toast
      }
      materialForm.reset(); // Reset form
      setIsAddMaterialDialogOpen(false); // Close dialog
      fetchMaterials(selectedClass.id); // Refresh materials list
    } catch (err) {
      console.error('Failed to save material:', err);
      toast.error('Failed to save material'); // Show error toast
    }
  };

  /**
   * Deletes a material after confirmation
   * @param material - Material object to delete
   */
  const deleteMaterial = async (material: Material) => {
    if (!selectedClass) return; // Exit if no class selected
    
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${material.title}"?`)) {
      return; // Exit if user cancels
    }
    
    try {
      await apiClient.delete(`/v1/classes/${selectedClass.id}/materials/${material.id}`); // DELETE request
      toast.success('Material deleted successfully'); // Show success toast
      fetchMaterials(selectedClass.id); // Refresh materials list
    } catch (err) {
      console.error('Failed to delete material:', err);
      toast.error('Failed to delete material'); // Show error toast
    }
  };

  /**
   * Toggles material publish status
   * @param material - Material object to toggle
   */
  const toggleMaterialPublish = async (material: Material) => {
    if (!selectedClass) return; // Exit if no class selected
    
    try {
      await apiClient.patch(`/v1/classes/${selectedClass.id}/materials/${material.id}/publish`); // PATCH request
      toast.success(material.is_published ? 'Material unpublished' : 'Material published'); // Show success toast
      fetchMaterials(selectedClass.id); // Refresh materials list
    } catch (err) {
      console.error('Failed to toggle publish status:', err);
      toast.error('Failed to update publish status'); // Show error toast
    }
  };

  /**
   * Gets badge variant based on material type
   * @param type - Material type
   * @returns Badge variant string
   */
  const getMaterialTypeBadgeVariant = (type: MaterialType): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<MaterialType, "default" | "secondary" | "destructive" | "outline"> = {
      pdf: 'destructive', // Red for PDF
      ppt: 'secondary', // Gray for PPT
      quiz: 'default', // Default for Quiz
      game: 'default', // Default for Game
      video: 'secondary', // Gray for Video
      document: 'outline', // Outline for Document
      other: 'outline', // Outline for Other
    };
    return variants[type] || 'default'; // Return variant or default
  };

  // Fetch classes on component mount and when filters change
  useEffect(() => {
    fetchClasses();
  }, [semesterFilter, departmentFilter]); // Refetch when filters change

  // Refresh classes when window regains focus (user navigates back to this tab)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window focused, refreshing classes...'); // Log for debugging
      fetchClasses(); // Refresh data when window gains focus
    };

    window.addEventListener('focus', handleFocus); // Add focus event listener
    return () => window.removeEventListener('focus', handleFocus); // Cleanup on unmount
  }, [semesterFilter, departmentFilter]); // Dependencies for the focus handler

  // Listen for subject creation events from other pages (e.g., AdminCourses)
  useEffect(() => {
    const handleSubjectsUpdated = () => {
      console.log('Subjects updated event received, refreshing classes...'); // Log for debugging
      fetchClasses(); // Refresh classes when subjects are updated
    };

    window.addEventListener('subjectsUpdated', handleSubjectsUpdated); // Listen for custom event
    return () => window.removeEventListener('subjectsUpdated', handleSubjectsUpdated); // Cleanup
  }, [semesterFilter, departmentFilter]); // Dependencies for the event handler

  /**
   * Fetches subjects for the subject selector dropdown
   */
  const fetchSubjects = async () => {
    setSubjectsLoading(true); // Set loading state
    try {
      const response = await apiClient.get<Subject[]>('/v1/subjects'); // Fetch subjects
      setSubjects(response.data); // Update subjects state
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    } finally {
      setSubjectsLoading(false); // Clear loading state
    }
  };

  // Fetch subjects when add class dialog opens
  useEffect(() => {
    if (isAddClassDialogOpen) {
      fetchSubjects();
    }
  }, [isAddClassDialogOpen]);

  return (
    <div className="space-y-6">
      {/* Page header with title and Add Class button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Classes Management</h1>
        <Dialog open={isAddClassDialogOpen} onOpenChange={setIsAddClassDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Class
            </Button>
          </DialogTrigger>
          {/* Add Class Dialog Content */}
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
              <DialogDescription>Create a new class by filling in the required details below.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Code field */}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CS101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Name field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Introduction to Computer Science" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Semester field */}
                <FormField
                  control={form.control}
                  name="semester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a semester" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map(s => (
                            <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Department field */}
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CSE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Teacher Name field */}
                <FormField
                  control={form.control}
                  name="teacher_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teacher Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Dr. Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Schedule field */}
                <FormField
                  control={form.control}
                  name="schedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Mon, Wed, Fri 10:00-11:00 AM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Room field */}
                <FormField
                  control={form.control}
                  name="room"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., A101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Subject field (optional) */}
                <FormField
                  control={form.control}
                  name="subject_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjectsLoading ? (
                            <SelectItem value="" disabled>Loading subjects...</SelectItem>
                          ) : (
                            <>
                              <SelectItem value="">No Subject</SelectItem>
                              {subjects.map(subject => (
                                <SelectItem key={subject.id} value={String(subject.id)}>
                                  {subject.code} - {subject.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Add Class
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Semester filter */}
            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-muted-foreground mb-1">Semester</label>
              <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                <SelectTrigger id="semester">
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map(s => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Department filter */}
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-muted-foreground mb-1">Department</label>
              <Input
                id="department"
                placeholder="Enter Department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              />
            </div>
            {/* Apply Filters button */}
            <div className="flex items-end">
                <Button onClick={fetchClasses} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
                    {loading ? "Loading..." : "Apply Filters"}
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Classes List</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          {loading && !classes.length ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center">No classes found.</TableCell>
                  </TableRow>
                ) : (
                  classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell>{cls.code}</TableCell>
                      <TableCell>{cls.name}</TableCell>
                      <TableCell>{cls.subject_code || '-'}</TableCell>
                      <TableCell>{cls.subject_name || 'Not Assigned'}</TableCell>
                      <TableCell>{cls.semester}</TableCell>
                      <TableCell>{cls.department}</TableCell>
                      <TableCell>{cls.teacher_name}</TableCell>
                      <TableCell>{cls.schedule}</TableCell>
                      <TableCell>{cls.room}</TableCell>
                      <TableCell>{cls.created_by}</TableCell>
                      <TableCell>{new Date(cls.created_at).toLocaleDateString()}</TableCell>
                      {/* Actions column with two materials management buttons */}
                      <TableCell>
                        <div className="flex space-x-2">
                          {/* Primary button: Navigate to class editor */}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleManageMaterials(cls)}
                            title="Open class editor (lessons, assets, materials)"
                          >
                            <FolderOpen className="h-4 w-4 mr-1" />
                            Editor
                          </Button>
                          {/* Secondary button: Quick materials CRUD dialog */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMaterialsDialog(cls)}
                            title="Quick add/edit materials (simple dialog)"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Quick
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Materials Management Dialog */}
      <Dialog open={isMaterialsDialogOpen} onOpenChange={setIsMaterialsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Materials - {selectedClass?.name || 'Class'}
            </DialogTitle>
            <DialogDescription>View, add, edit, and delete study materials for this class.</DialogDescription>
          </DialogHeader>
          
          {/* Add Material Button */}
          <div className="flex justify-end mb-4">
            <Button onClick={openAddMaterialDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Material
            </Button>
          </div>

          {/* Materials List */}
          {materialsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No materials found for this class.</p>
              <p className="text-sm">Click "Add Material" to add study materials.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material.id}>
                    {/* Material Type Badge */}
                    <TableCell>
                      <Badge variant={getMaterialTypeBadgeVariant(material.type)}>
                        {material.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    {/* Material Title */}
                    <TableCell className="font-medium">{material.title}</TableCell>
                    {/* Material Description */}
                    <TableCell className="max-w-[200px] truncate">
                      {material.description || '-'}
                    </TableCell>
                    {/* Published Toggle */}
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={material.is_published}
                          onCheckedChange={() => toggleMaterialPublish(material)}
                        />
                        <span className="text-sm">
                          {material.is_published ? (
                            <span className="text-green-600 flex items-center"><Eye className="h-4 w-4 mr-1" />Visible</span>
                          ) : (
                            <span className="text-gray-500 flex items-center"><EyeOff className="h-4 w-4 mr-1" />Hidden</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    {/* Edit/Delete Actions */}
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditMaterialDialog(material)}
                          title="Edit Material"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMaterial(material)}
                          title="Delete Material"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Material Dialog */}
      <Dialog open={isAddMaterialDialogOpen} onOpenChange={setIsAddMaterialDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? 'Edit Material' : 'Add New Material'}
            </DialogTitle>
            <DialogDescription>
              {editingMaterial ? 'Update the material details below.' : 'Fill in the details to add a new study material.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...materialForm}>
            <form onSubmit={materialForm.handleSubmit(onMaterialSubmit)} className="space-y-4">
              {/* Material Type */}
              <FormField
                control={materialForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="ppt">PPT</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="game">Game</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Material Title */}
              <FormField
                control={materialForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Chapter 1 Notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Material Description */}
              <FormField
                control={materialForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the material" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* File URL */}
              <FormField
                control={materialForm.control}
                name="file_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File URL</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., /uploads/materials/chapter1.pdf" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Published Status */}
              <FormField
                control={materialForm.control}
                name="is_published"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Publish to Students</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Make this material visible to students
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={materialForm.formState.isSubmitting} className="w-full">
                {materialForm.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingMaterial ? 'Update Material' : 'Add Material'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}