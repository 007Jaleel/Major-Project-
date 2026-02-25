/**
 * ClassDetail.tsx - Student page for viewing class details and materials
 * Displays class information and materials grouped by type (PDF, PPT, Quiz, Game, Video, Document, Other)
 * Only shows published materials to students.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useParams for route params
import apiClient from '@/lib/apiClient'; // Import apiClient for API calls
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Import Badge for material type display
import { Loader2, ArrowLeft, FileText, Video, Presentation, Gamepad2, HelpCircle, File, ExternalLink, BookOpen, User, Calendar, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner'; // Import toast for notifications

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
 * Interface for Class object with materials
 * Represents a class with all its properties and associated materials
 */
interface ClassWithMaterials {
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
  materials?: Material[]; // Array of materials for this class
}

/**
 * Material type configuration for display
 * Maps material types to their display properties
 */
const materialTypeConfig: Record<MaterialType, { label: string; icon: React.ReactNode; color: string }> = {
  pdf: { 
    label: 'PDF Documents', 
    icon: <FileText className="h-5 w-5" />, 
    color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' 
  },
  ppt: { 
    label: 'Presentations', 
    icon: <Presentation className="h-5 w-5" />, 
    color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' 
  },
  video: { 
    label: 'Videos', 
    icon: <Video className="h-5 w-5" />, 
    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' 
  },
  quiz: { 
    label: 'Quizzes', 
    icon: <HelpCircle className="h-5 w-5" />, 
    color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' 
  },
  game: { 
    label: 'Games & Activities', 
    icon: <Gamepad2 className="h-5 w-5" />, 
    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
  },
  document: { 
    label: 'Documents', 
    icon: <File className="h-5 w-5" />, 
    color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' 
  },
  other: { 
    label: 'Other Materials', 
    icon: <FileText className="h-5 w-5" />, 
    color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' 
  },
};

/**
 * ClassDetail component - Main component for viewing class details and materials
 * Fetches class data with materials and displays them grouped by type
 */
export default function ClassDetail() {
  const { classId } = useParams<{ classId: string }>(); // Get classId from URL params
  const navigate = useNavigate(); // Navigate hook for back button
  
  // State for class data and loading
  const [classData, setClassData] = useState<ClassWithMaterials | null>(null); // Class data with materials
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [error, setError] = useState<string>(''); // Error message

  /**
   * Fetches class details with materials from the API
   * Only published materials are returned for students
   */
  const fetchClassDetails = async () => {
    if (!classId) {
      setError('Class ID is required'); // Set error if no classId
      setLoading(false);
      return;
    }

    setLoading(true); // Set loading state
    setError(''); // Clear previous error
    
    try {
      // Fetch class with materials from API
      const response = await apiClient.get<ClassWithMaterials>(`/v1/classes/${classId}/with-materials`);
      setClassData(response.data); // Update class data state
    } catch (err: any) {
      console.error('Failed to fetch class details:', err); // Log error
      
      // Handle different error scenarios
      if (err?.response?.status === 404) {
        setError('Class not found. It may have been removed.'); // Not found error
      } else if (err?.response?.status === 401) {
        setError('Please log in to view this class.'); // Auth error
      } else {
        setError(err?.response?.data?.message || 'Failed to load class details.'); // Generic error
      }
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  // Fetch class details on component mount
  useEffect(() => {
    fetchClassDetails();
  }, [classId]); // Refetch when classId changes

  /**
   * Groups materials by their type
   * @param materials - Array of materials to group
   * @returns Object with material types as keys and arrays of materials as values
   */
  const groupMaterialsByType = (materials: Material[]): Record<MaterialType, Material[]> => {
    const grouped: Record<MaterialType, Material[]> = {
      pdf: [],
      ppt: [],
      video: [],
      quiz: [],
      game: [],
      document: [],
      other: [],
    };
    
    // Group each material by its type
    materials.forEach(material => {
      if (grouped[material.type]) {
        grouped[material.type].push(material);
      }
    });
    
    return grouped;
  };

  /**
   * Formats file size in bytes to human readable format
   * @param bytes - File size in bytes
   * @returns Formatted file size string
   */
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''; // Return empty if no size
    if (bytes < 1024) return `${bytes} B`; // Bytes
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; // Kilobytes
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; // Megabytes
  };

  /**
   * Handles clicking on a material link
   * Opens the file URL in a new tab
   * @param material - Material object that was clicked
   */
  const handleMaterialClick = (material: Material) => {
    // Open file URL in new tab
    window.open(material.file_url, '_blank', 'noopener,noreferrer');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading class details...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Classes
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchClassDetails}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show not found state
  if (!classData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Classes
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Class not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get materials grouped by type
  const groupedMaterials = groupMaterialsByType(classData.materials || []);
  
  // Get list of types that have materials
  const typesWithMaterials = (Object.keys(groupedMaterials) as MaterialType[])
    .filter(type => groupedMaterials[type].length > 0);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Classes
      </Button>

      {/* Class Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{classData.name}</CardTitle>
              <CardDescription className="text-lg mt-1">{classData.code}</CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              Semester {classData.semester}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Department */}
            <div className="flex items-center text-muted-foreground">
              <BookOpen className="h-4 w-4 mr-2" />
              <span>{classData.department}</span>
            </div>
            {/* Teacher */}
            <div className="flex items-center text-muted-foreground">
              <User className="h-4 w-4 mr-2" />
              <span>{classData.teacher_name}</span>
            </div>
            {/* Schedule */}
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              <span>{classData.schedule}</span>
            </div>
            {/* Room */}
            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2" />
              <span>Room {classData.room}</span>
            </div>
          </div>
          
          {/* Subject info if available */}
          {classData.subject_name && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Subject: <span className="font-medium text-foreground">{classData.subject_name}</span>
                {classData.subject_code && (
                  <span className="ml-2 text-muted-foreground">({classData.subject_code})</span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Study Materials</h2>
        
        {typesWithMaterials.length === 0 ? (
          // No materials state
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No study materials available for this class yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Check back later for updates.</p>
            </CardContent>
          </Card>
        ) : (
          // Materials grouped by type
          typesWithMaterials.map(type => {
            const config = materialTypeConfig[type];
            const materials = groupedMaterials[type];
            
            return (
              <Card key={type}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      {config.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{config.label}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {materials.length} {materials.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {materials.map(material => (
                      <div
                        key={material.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => handleMaterialClick(material)}
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{material.title}</h4>
                          {material.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {material.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {material.file_size && (
                              <span>{formatFileSize(material.file_size)}</span>
                            )}
                            <span>Added {new Date(material.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground ml-4 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}