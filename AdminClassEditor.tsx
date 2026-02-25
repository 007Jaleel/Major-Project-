/**
 * AdminClassEditor.tsx - Main page for editing class lessons and materials
 * Two-pane layout: ClassStructureSidebar (left) + LessonEditorPanel (right)
 * Inspired by Microsoft AI Skills Passport layout
 */

import React, { useEffect, useState, useCallback } from "react"; // Import React hooks
import { useParams, useNavigate } from "react-router-dom"; // Import routing hooks
import { toast } from "sonner"; // Import toast notifications
import apiClient from "@/lib/apiClient"; // Import API client
import { Button } from "@/components/ui/button"; // Import Button component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Input } from "@/components/ui/input"; // Import Input component
import { Textarea } from "@/components/ui/textarea"; // Import Textarea component
import { Label } from "@/components/ui/label"; // Import Label component
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  FileText,
  Video,
  HelpCircle,
  CheckCircle,
  X,
  Upload,
  Download,
  FileIcon,
} from "lucide-react"; // Import icons

// Type definitions for lesson system
type LessonType = 'intro' | 'text' | 'video' | 'quiz' | 'closing';

interface Lesson {
  id: number;
  section_id: number;
  title: string;
  type: LessonType;
  order: number;
  duration: number;
  content: string | null;
  video_url: string | null;
  quiz_id: number | null;
  created_at: string;
  updated_at: string;
}

interface Section {
  id: number;
  class_id: number;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface QuizQuestion {
  id?: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
}

interface Quiz {
  id: number;
  title: string;
  description: string | null;
  passing_score: number;
  questions: QuizQuestion[];
}

interface LessonAsset {
  id: number;
  lesson_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface LessonWithQuiz extends Lesson {
  quiz_data?: Quiz;
}

// Icon mapping for lesson types
const getLessonIcon = (type: LessonType) => {
  switch (type) {
    case 'intro':
      return <FileText className="w-4 h-4" />; // Intro icon
    case 'text':
      return <FileText className="w-4 h-4" />; // Text icon
    case 'video':
      return <Video className="w-4 h-4" />; // Video icon
    case 'quiz':
      return <HelpCircle className="w-4 h-4" />; // Quiz icon
    case 'closing':
      return <CheckCircle className="w-4 h-4" />; // Closing icon
    default:
      return <FileText className="w-4 h-4" />; // Default icon
  }
};

// Format file size for display
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`; // Bytes
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; // KB
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; // MB
};

/**
 * AdminClassEditor - Main component for editing class lessons
 */
export default function AdminClassEditor() {
  const { classId } = useParams<{ classId: string }>(); // Get classId from URL
  const navigate = useNavigate(); // Navigation hook

  // State for sections and lessons
  const [sections, setSections] = useState<Section[]>([]); // Sections array
  const [className, setClassName] = useState<string>(""); // Class name for header
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [saving, setSaving] = useState<boolean>(false); // Saving state

  // State for selected lesson
  const [selectedLesson, setSelectedLesson] = useState<LessonWithQuiz | null>(null); // Currently selected lesson
  const [lessonAssets, setLessonAssets] = useState<LessonAsset[]>([]); // Assets for selected lesson

  // State for editing section title
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null); // Section being edited
  const [editingSectionTitle, setEditingSectionTitle] = useState<string>(""); // New section title

  // State for adding new section
  const [newSectionTitle, setNewSectionTitle] = useState<string>(""); // New section title input
  const [showNewSectionInput, setShowNewSectionInput] = useState<boolean>(false); // Show new section input

  // State for adding new lesson
  const [newLessonSectionId, setNewLessonSectionId] = useState<number | null>(null); // Section for new lesson
  const [newLessonTitle, setNewLessonTitle] = useState<string>(""); // New lesson title
  const [newLessonType, setNewLessonType] = useState<LessonType>('text'); // New lesson type

  // Fetch sections and lessons on mount
  useEffect(() => {
    fetchSections(); // Load sections when component mounts
  }, [classId]);

  // Fetch sections from API
  const fetchSections = async () => {
    if (!classId) return; // Guard against missing classId
    setLoading(true); // Set loading state
    try {
      const response = await apiClient.get(`/admin/classes/${classId}/sections`); // API call
      setSections(response.data); // Update sections state
      // Get class name from the first section if available
      if (response.data.length > 0 && response.data[0].class_id) {
        // Fetch class details for name
        try {
          const classResponse = await apiClient.get(`/v1/classes/${classId}`); // Get class details
          setClassName(classResponse.data.name || `Class ${classId}`); // Set class name
        } catch {
          setClassName(`Class ${classId}`); // Fallback class name
        }
      } else {
        setClassName(`Class ${classId}`); // Fallback if no sections
      }
    } catch (error: any) {
      console.error("Error fetching sections:", error); // Log error
      toast.error("Failed to load sections"); // Show error toast
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  // Fetch lesson details including quiz data
  const fetchLesson = async (lessonId: number) => {
    try {
      const response = await apiClient.get(`/admin/lessons/${lessonId}`); // API call
      setSelectedLesson(response.data); // Update selected lesson
      fetchAssets(lessonId); // Load assets for this lesson
    } catch (error: any) {
      console.error("Error fetching lesson:", error); // Log error
      toast.error("Failed to load lesson"); // Show error toast
    }
  };

  // Fetch assets for a lesson
  const fetchAssets = async (lessonId: number) => {
    try {
      const response = await apiClient.get(`/admin/lessons/${lessonId}/assets`); // API call
      setLessonAssets(response.data); // Update assets state
    } catch (error: any) {
      console.error("Error fetching assets:", error); // Log error
    }
  };

  // Create new section
  const handleCreateSection = async () => {
    if (!newSectionTitle.trim()) {
      toast.error("Section title is required"); // Validation error
      return;
    }
    try {
      const response = await apiClient.post(`/admin/classes/${classId}/sections`, {
        title: newSectionTitle.trim(), // Send trimmed title
      });
      setSections([...sections, response.data]); // Add new section to state
      setNewSectionTitle(""); // Clear input
      setShowNewSectionInput(false); // Hide input
      toast.success("Section created"); // Success toast
    } catch (error: any) {
      console.error("Error creating section:", error); // Log error
      toast.error("Failed to create section"); // Error toast
    }
  };

  // Update section title
  const handleUpdateSection = async (sectionId: number) => {
    if (!editingSectionTitle.trim()) {
      toast.error("Section title is required"); // Validation error
      return;
    }
    try {
      const response = await apiClient.put(`/admin/sections/${sectionId}`, {
        title: editingSectionTitle.trim(), // Send trimmed title
      });
      setSections(sections.map(s => s.id === sectionId ? { ...s, title: response.data.title } : s)); // Update state
      setEditingSectionId(null); // Clear editing state
      toast.success("Section updated"); // Success toast
    } catch (error: any) {
      console.error("Error updating section:", error); // Log error
      toast.error("Failed to update section"); // Error toast
    }
  };

  // Delete section
  const handleDeleteSection = async (sectionId: number) => {
    if (!confirm("Delete this section and all its lessons?")) return; // Confirm deletion
    try {
      await apiClient.delete(`/admin/sections/${sectionId}`); // API call
      setSections(sections.filter(s => s.id !== sectionId)); // Remove from state
      if (selectedLesson?.section_id === sectionId) {
        setSelectedLesson(null); // Clear selected lesson if in deleted section
      }
      toast.success("Section deleted"); // Success toast
    } catch (error: any) {
      console.error("Error deleting section:", error); // Log error
      toast.error("Failed to delete section"); // Error toast
    }
  };

  // Create new lesson
  const handleCreateLesson = async () => {
    if (!newLessonSectionId) return; // Guard against missing section
    if (!newLessonTitle.trim()) {
      toast.error("Lesson title is required"); // Validation error
      return;
    }
    try {
      const response = await apiClient.post(`/admin/sections/${newLessonSectionId}/lessons`, {
        title: newLessonTitle.trim(), // Send title
        type: newLessonType, // Send type
      });
      // Update sections state with new lesson
      setSections(sections.map(s => {
        if (s.id === newLessonSectionId) {
          return { ...s, lessons: [...s.lessons, response.data] }; // Add lesson to section
        }
        return s;
      }));
      setNewLessonSectionId(null); // Clear state
      setNewLessonTitle(""); // Clear input
      setNewLessonType('text'); // Reset type
      toast.success("Lesson created"); // Success toast
    } catch (error: any) {
      console.error("Error creating lesson:", error); // Log error
      toast.error("Failed to create lesson"); // Error toast
    }
  };

  // Update lesson
  const handleUpdateLesson = async () => {
    if (!selectedLesson) return; // Guard against no selection
    if (!selectedLesson.title.trim()) {
      toast.error("Lesson title is required"); // Validation error
      return;
    }
    setSaving(true); // Set saving state
    try {
      // First, update the lesson
      await apiClient.put(`/admin/lessons/${selectedLesson.id}`, {
        title: selectedLesson.title, // Send title
        type: selectedLesson.type, // Send type
        duration: selectedLesson.duration, // Send duration
        content: selectedLesson.content, // Send content
        video_url: selectedLesson.video_url, // Send video URL
      });

      // If quiz lesson, update/create quiz
      if (selectedLesson.type === 'quiz' && selectedLesson.quiz_data) {
        if (selectedLesson.quiz_id) {
          // Update existing quiz
          await apiClient.put(`/admin/quizzes/${selectedLesson.quiz_id}`, {
            title: selectedLesson.quiz_data.title, // Quiz title
            description: selectedLesson.quiz_data.description, // Quiz description
            passing_score: selectedLesson.quiz_data.passing_score, // Passing score
            questions: selectedLesson.quiz_data.questions, // Questions
          });
        } else {
          // Create new quiz
          const quizResponse = await apiClient.post(`/admin/quizzes`, {
            title: selectedLesson.quiz_data.title, // Quiz title
            description: selectedLesson.quiz_data.description, // Quiz description
            passing_score: selectedLesson.quiz_data.passing_score, // Passing score
            questions: selectedLesson.quiz_data.questions, // Questions
          });
          // Update lesson with quiz_id
          await apiClient.put(`/admin/lessons/${selectedLesson.id}`, {
            quiz_id: quizResponse.data.id, // Link quiz to lesson
          });
        }
      }

      // Update sections state
      setSections(sections.map(s => ({
        ...s,
        lessons: s.lessons.map(l => l.id === selectedLesson.id ? selectedLesson : l), // Update lesson in section
      })));

      toast.success("Lesson saved"); // Success toast
    } catch (error: any) {
      console.error("Error updating lesson:", error); // Log error
      toast.error("Failed to save lesson"); // Error toast
    } finally {
      setSaving(false); // Clear saving state
    }
  };

  // Delete lesson
  const handleDeleteLesson = async (lessonId: number) => {
    if (!confirm("Delete this lesson?")) return; // Confirm deletion
    try {
      await apiClient.delete(`/admin/lessons/${lessonId}`); // API call
      // Remove lesson from state
      setSections(sections.map(s => ({
        ...s,
        lessons: s.lessons.filter(l => l.id !== lessonId), // Filter out deleted lesson
      })));
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson(null); // Clear selected if deleted
      }
      toast.success("Lesson deleted"); // Success toast
    } catch (error: any) {
      console.error("Error deleting lesson:", error); // Log error
      toast.error("Failed to delete lesson"); // Error toast
    }
  };

  // Move section up/down
  const handleMoveSection = async (sectionId: number, direction: 'up' | 'down') => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId); // Find section index
    if (sectionIndex === -1) return; // Guard against not found
    if (direction === 'up' && sectionIndex === 0) return; // Can't move up from top
    if (direction === 'down' && sectionIndex === sections.length - 1) return; // Can't move down from bottom

    const newSections = [...sections]; // Copy array
    const swapIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1; // Index to swap with
    [newSections[sectionIndex], newSections[swapIndex]] = [newSections[swapIndex], newSections[sectionIndex]]; // Swap

    setSections(newSections); // Update state optimistically

    try {
      await apiClient.put(`/admin/classes/${classId}/sections/reorder`, {
        sectionOrder: newSections.map(s => s.id), // Send new order
      });
    } catch (error: any) {
      console.error("Error reordering sections:", error); // Log error
      fetchSections(); // Revert on error
    }
  };

  // Move lesson up/down within section
  const handleMoveLesson = async (sectionId: number, lessonId: number, direction: 'up' | 'down') => {
    const section = sections.find(s => s.id === sectionId); // Find section
    if (!section) return; // Guard against not found
    const lessonIndex = section.lessons.findIndex(l => l.id === lessonId); // Find lesson index
    if (lessonIndex === -1) return; // Guard against not found
    if (direction === 'up' && lessonIndex === 0) return; // Can't move up from top
    if (direction === 'down' && lessonIndex === section.lessons.length - 1) return; // Can't move down from bottom

    const newLessons = [...section.lessons]; // Copy lessons array
    const swapIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1; // Index to swap with
    [newLessons[lessonIndex], newLessons[swapIndex]] = [newLessons[swapIndex], newLessons[lessonIndex]]; // Swap

    // Update sections state
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, lessons: newLessons }; // Update lessons in section
      }
      return s;
    }));

    try {
      await apiClient.put(`/admin/sections/${sectionId}/lessons/reorder`, {
        lessonOrder: newLessons.map(l => l.id), // Send new order
      });
    } catch (error: any) {
      console.error("Error reordering lessons:", error); // Log error
      fetchSections(); // Revert on error
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedLesson || !e.target.files?.length) return; // Guard against no selection
    const file = e.target.files[0]; // Get first file
    const formData = new FormData(); // Create form data
    formData.append('file', file); // Add file to form

    try {
      // NOTE: Do NOT set Content-Type header manually - let axios/browser set it
      // with the correct multipart boundary automatically
      const response = await apiClient.post(`/admin/lessons/${selectedLesson.id}/assets`, formData);
      setLessonAssets([...lessonAssets, response.data]); // Add to assets state
      toast.success("File uploaded successfully"); // Success toast
    } catch (error: any) {
      console.error("Error uploading file:", error); // Log full error for debugging
      
      // Extract meaningful error message from backend response
      // Axios error responses have the backend data in error.response.data
      const backendMessage = error.response?.data?.message || // Standard error message
                             error.response?.data?.error || // Alternative error field
                             error.message; // Fallback to axios error message
      
      // Show specific error message to user
      toast.error(backendMessage || "Failed to upload file"); // Error toast with backend message
    }
    // Reset input
    e.target.value = '';
  };

  // Delete asset
  const handleDeleteAsset = async (assetId: number) => {
    if (!confirm("Delete this file?")) return; // Confirm deletion
    try {
      await apiClient.delete(`/admin/assets/${assetId}`); // API call
      setLessonAssets(lessonAssets.filter(a => a.id !== assetId)); // Remove from state
      toast.success("File deleted"); // Success toast
    } catch (error: any) {
      console.error("Error deleting asset:", error); // Log error
      toast.error("Failed to delete file"); // Error toast
    }
  };

  // Download asset
  const handleDownloadAsset = async (assetId: number, fileName: string) => {
    try {
      const response = await apiClient.get(`/admin/assets/${assetId}/download`, {
        responseType: 'blob', // Get as blob
      });
      const url = window.URL.createObjectURL(new Blob([response.data])); // Create URL
      const link = document.createElement('a'); // Create link element
      link.href = url; // Set URL
      link.setAttribute('download', fileName); // Set download name
      document.body.appendChild(link); // Add to DOM
      link.click(); // Click to download
      link.remove(); // Remove from DOM
      window.URL.revokeObjectURL(url); // Clean up URL
    } catch (error: any) {
      console.error("Error downloading file:", error); // Log error
      toast.error("Failed to download file"); // Error toast
    }
  };

  // Add quiz question
  const addQuizQuestion = () => {
    if (!selectedLesson?.quiz_data) return; // Guard against no quiz
    const newQuestion: QuizQuestion = {
      question: '', // Empty question
      option_a: '', // Empty option A
      option_b: '', // Empty option B
      option_c: '', // Empty option C
      option_d: '', // Empty option D
      correct_option: 'A', // Default correct
    };
    setSelectedLesson({
      ...selectedLesson,
      quiz_data: {
        ...selectedLesson.quiz_data,
        questions: [...selectedLesson.quiz_data.questions, newQuestion], // Add question
      },
    });
  };

  // Update quiz question
  const updateQuizQuestion = (index: number, field: keyof QuizQuestion, value: string) => {
    if (!selectedLesson?.quiz_data) return; // Guard against no quiz
    const questions = [...selectedLesson.quiz_data.questions]; // Copy questions
    questions[index] = { ...questions[index], [field]: value }; // Update question
    setSelectedLesson({
      ...selectedLesson,
      quiz_data: {
        ...selectedLesson.quiz_data,
        questions, // Update questions
      },
    });
  };

  // Remove quiz question
  const removeQuizQuestion = (index: number) => {
    if (!selectedLesson?.quiz_data) return; // Guard against no quiz
    const questions = selectedLesson.quiz_data.questions.filter((_, i) => i !== index); // Filter out question
    setSelectedLesson({
      ...selectedLesson,
      quiz_data: {
        ...selectedLesson.quiz_data,
        questions, // Update questions
      },
    });
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/courses')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Subjects
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{className || 'Class Editor'}</h1>
            <p className="text-sm text-muted-foreground">Classes / {className}</p>
          </div>
        </div>
      </div>

      {/* Main content - two panes */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane - Sections & Lessons */}
        <div className="w-80 bg-muted/30 border-r overflow-y-auto">
          <div className="p-4">
            {/* Add Section button */}
            {!showNewSectionInput ? (
              <Button 
                variant="outline" 
                className="w-full mb-4"
                onClick={() => setShowNewSectionInput(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Section
              </Button>
            ) : (
              <div className="mb-4 p-3 bg-background rounded-lg border">
                <Input
                  placeholder="Section title"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="mb-2"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateSection}>Create</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewSectionInput(false); setNewSectionTitle(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Sections list */}
            {sections.map((section) => (
              <div key={section.id} className="mb-4 bg-background rounded-lg border">
                {/* Section header */}
                <div className="p-3 border-b flex items-center justify-between">
                  {editingSectionId === section.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editingSectionTitle}
                        onChange={(e) => setEditingSectionTitle(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => handleUpdateSection(section.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSectionId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div 
                        className="flex-1 cursor-pointer font-medium"
                        onClick={() => { setEditingSectionId(section.id); setEditingSectionTitle(section.title); }}
                      >
                        {section.title}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleMoveSection(section.id, 'up')}
                          disabled={section.order === 1}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleMoveSection(section.id, 'down')}
                          disabled={section.order === sections.length}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSection(section.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Lessons list */}
                <div className="p-2">
                  {section.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`p-2 mb-1 rounded cursor-pointer flex items-center justify-between ${
                        selectedLesson?.id === lesson.id 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => fetchLesson(lesson.id)}
                    >
                      <div className="flex items-center gap-2">
                        {getLessonIcon(lesson.type)}
                        <span className="text-sm">{lesson.title}</span>
                        {lesson.type === 'quiz' && (
                          <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded">Quiz</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); handleMoveLesson(section.id, lesson.id, 'up'); }}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); handleMoveLesson(section.id, lesson.id, 'down'); }}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add Lesson button */}
                  {newLessonSectionId === section.id ? (
                    <div className="mt-2 p-2 bg-muted rounded">
                      <Input
                        placeholder="Lesson title"
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        className="mb-2"
                      />
                      <select
                        className="w-full h-9 rounded-md border bg-background px-2 text-sm mb-2"
                        value={newLessonType}
                        onChange={(e) => setNewLessonType(e.target.value as LessonType)}
                      >
                        <option value="intro">Intro</option>
                        <option value="text">Text</option>
                        <option value="video">Video</option>
                        <option value="quiz">Quiz</option>
                        <option value="closing">Closing</option>
                      </select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreateLesson}>Create</Button>
                        <Button size="sm" variant="ghost" onClick={() => setNewLessonSectionId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => setNewLessonSectionId(section.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Lesson
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Empty state */}
            {sections.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No sections yet. Create your first section above.
              </div>
            )}
          </div>
        </div>

        {/* Right pane - Lesson Editor */}
        <div className="flex-1 overflow-y-auto bg-background">
          {selectedLesson ? (
            <div className="p-6 max-w-4xl mx-auto">
              {/* Lesson metadata card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Lesson Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Title */}
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={selectedLesson.title}
                      onChange={(e) => setSelectedLesson({ ...selectedLesson, title: e.target.value })}
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <select
                      id="type"
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                      value={selectedLesson.type}
                      onChange={(e) => setSelectedLesson({ ...selectedLesson, type: e.target.value as LessonType })}
                    >
                      <option value="intro">Intro</option>
                      <option value="text">Text</option>
                      <option value="video">Video</option>
                      <option value="quiz">Quiz</option>
                      <option value="closing">Closing</option>
                    </select>
                  </div>

                  {/* Duration */}
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={selectedLesson.duration}
                      onChange={(e) => setSelectedLesson({ ...selectedLesson, duration: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Content based on type */}
              {(selectedLesson.type === 'intro' || selectedLesson.type === 'text' || selectedLesson.type === 'closing') && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Lesson Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Enter lesson content (HTML supported)"
                      value={selectedLesson.content || ''}
                      onChange={(e) => setSelectedLesson({ ...selectedLesson, content: e.target.value })}
                      rows={10}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Video content */}
              {selectedLesson.type === 'video' && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Video Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="video_url">Video URL (YouTube embed URL)</Label>
                      <Input
                        id="video_url"
                        placeholder="https://www.youtube.com/embed/..."
                        value={selectedLesson.video_url || ''}
                        onChange={(e) => setSelectedLesson({ ...selectedLesson, video_url: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="video_content">Description / Notes</Label>
                      <Textarea
                        id="video_content"
                        placeholder="Additional notes about the video"
                        value={selectedLesson.content || ''}
                        onChange={(e) => setSelectedLesson({ ...selectedLesson, content: e.target.value })}
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quiz content */}
              {selectedLesson.type === 'quiz' && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Quiz Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Quiz title */}
                    <div>
                      <Label>Quiz Title</Label>
                      <Input
                        value={selectedLesson.quiz_data?.title || ''}
                        onChange={(e) => setSelectedLesson({
                          ...selectedLesson,
                          quiz_data: { ...(selectedLesson.quiz_data || { id: 0, title: '', description: null, passing_score: 70, questions: [] }), title: e.target.value }
                        })}
                      />
                    </div>

                    {/* Passing score */}
                    <div>
                      <Label>Passing Score (%)</Label>
                      <Input
                        type="number"
                        value={selectedLesson.quiz_data?.passing_score || 70}
                        onChange={(e) => setSelectedLesson({
                          ...selectedLesson,
                          quiz_data: { ...(selectedLesson.quiz_data || { id: 0, title: '', description: null, passing_score: 70, questions: [] }), passing_score: parseInt(e.target.value) || 70 }
                        })}
                      />
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Questions</Label>
                        <Button size="sm" variant="outline" onClick={addQuizQuestion}>
                          <Plus className="w-4 h-4 mr-1" /> Add Question
                        </Button>
                      </div>

                      {selectedLesson.quiz_data?.questions.map((q, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Question {index + 1}</span>
                            <Button size="sm" variant="ghost" onClick={() => removeQuizQuestion(index)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                          
                          <Input
                            placeholder="Question text"
                            value={q.question}
                            onChange={(e) => updateQuizQuestion(index, 'question', e.target.value)}
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Option A</Label>
                              <Input
                                value={q.option_a}
                                onChange={(e) => updateQuizQuestion(index, 'option_a', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Option B</Label>
                              <Input
                                value={q.option_b}
                                onChange={(e) => updateQuizQuestion(index, 'option_b', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Option C</Label>
                              <Input
                                value={q.option_c}
                                onChange={(e) => updateQuizQuestion(index, 'option_c', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Option D</Label>
                              <Input
                                value={q.option_d}
                                onChange={(e) => updateQuizQuestion(index, 'option_d', e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">Correct Answer</Label>
                            <select
                              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                              value={q.correct_option}
                              onChange={(e) => updateQuizQuestion(index, 'correct_option', e.target.value)}
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </div>
                        </div>
                      ))}

                      {(!selectedLesson.quiz_data?.questions || selectedLesson.quiz_data.questions.length === 0) && (
                        <div className="text-center text-muted-foreground py-4">
                          No questions yet. Click "Add Question" to create one.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lesson Materials / Assets */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Lesson Materials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload area */}
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drop PDF, PPT, DOC, images or ZIP here
                    </p>
                    <label>
                      <Input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.gif,.zip"
                      />
                      <Button variant="outline" size="sm" asChild>
                        <span>Upload files from computer</span>
                      </Button>
                    </label>
                  </div>

                  {/* Assets list */}
                  {lessonAssets.length > 0 && (
                    <div className="space-y-2">
                      {lessonAssets.map((asset) => (
                        <div 
                          key={asset.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileIcon className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{asset.file_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {asset.file_type.toUpperCase()} • {formatFileSize(asset.file_size)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDownloadAsset(asset.id, asset.file_name)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteAsset(asset.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save button */}
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => setSelectedLesson(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateLesson} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Lesson'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a lesson to edit</p>
                <p className="text-sm">Or create a new lesson from the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}