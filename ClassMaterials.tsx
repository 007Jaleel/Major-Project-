/**
 * ClassMaterials.tsx - Student page for viewing study materials (lesson assets)
 * Displays materials grouped by section and lesson, uploaded by admin via Class Editor
 */
import React, { useState, useEffect } from 'react'; // Import React hooks for state management
import { useParams, useNavigate } from 'react-router-dom'; // Import hooks for route params and navigation
import apiClient from '@/lib/apiClient'; // Use apiClient which attaches Bearer token automatically
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Import Card components
import { Button } from "@/components/ui/button"; // Import Button component for actions
import { Badge } from "@/components/ui/badge"; // Import Badge for file type display
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"; // Import Accordion for collapsible sections
import { Loader2, ArrowLeft, FileText, File, Download, FileImage, Presentation, Video, FolderOpen } from 'lucide-react'; // Import icons
import { toast } from 'sonner'; // Import toast for notifications

/**
 * Interface for a lesson asset (study material file)
 */
interface LessonAsset {
  id: number; // Unique asset identifier
  lesson_id: number; // ID of lesson this asset belongs to
  file_name: string; // Original file name
  file_type: string; // File type (pdf, ppt, image, document, etc.)
  file_size: number; // File size in bytes
  created_at: string; // When asset was uploaded
  lesson_title: string; // Title of the lesson this asset belongs to
  section_id: number; // ID of section the lesson belongs to
  section_title: string; // Title of section
}

/**
 * Interface for lesson with its assets
 */
interface LessonWithAssets {
  id: number; // Lesson ID
  title: string; // Lesson title
  assets: LessonAsset[]; // Array of assets for this lesson
}

/**
 * Interface for section with lessons and materials
 */
interface SectionMaterials {
  id: number; // Section ID
  title: string; // Section title
  order: number; // Section order
  lessons: LessonWithAssets[]; // Array of lessons with assets
}

/**
 * Interface for API response
 */
interface MaterialsResponse {
  success: boolean; // API success flag
  classId: number; // Class ID
  materials: SectionMaterials[]; // Array of sections with materials
}

/**
 * Get icon component based on file type
 * @param fileType - The file type string
 * @returns React node with appropriate icon
 */
const getFileIcon = (fileType: string): React.ReactNode => {
  const type = fileType.toLowerCase(); // Convert to lowercase for comparison
  switch (type) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />; // PDF icon in red
    case 'ppt':
    case 'powerpoint':
    case 'presentation':
      return <Presentation className="h-5 w-5 text-orange-500" />; // PPT icon in orange
    case 'image':
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
      return <FileImage className="h-5 w-5 text-blue-500" />; // Image icon in blue
    case 'video':
    case 'mp4':
      return <Video className="h-5 w-5 text-purple-500" />; // Video icon in purple
    default:
      return <File className="h-5 w-5 text-gray-500" />; // Default file icon
  }
};

/**
 * Format file size in bytes to human readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'; // Handle zero bytes
  if (bytes < 1024) return `${bytes} B`; // Bytes
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; // Kilobytes
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; // Megabytes
};

/**
 * Get badge color based on file type
 * @param fileType - The file type string
 * @returns Tailwind CSS classes for badge styling
 */
const getBadgeColor = (fileType: string): string => {
  const type = fileType.toLowerCase(); // Convert to lowercase for comparison
  switch (type) {
    case 'pdf':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'; // Red for PDF
    case 'ppt':
    case 'powerpoint':
    case 'presentation':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'; // Orange for PPT
    case 'image':
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'; // Blue for images
    case 'document':
    case 'word':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'; // Indigo for documents
    case 'zip':
    case 'compressed':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'; // Yellow for archives
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'; // Gray for others
  }
};

/**
 * ClassMaterials component - Displays study materials for a class
 * Fetches materials from API and displays them grouped by section and lesson
 */
export default function ClassMaterials() {
  const { classId } = useParams<{ classId: string }>(); // Get classId from URL params
  const navigate = useNavigate(); // Navigation hook for back button

  // State for materials data
  const [materials, setMaterials] = useState<SectionMaterials[]>([]); // Array of sections with materials
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [error, setError] = useState<string>(''); // Error message
  const [downloadingId, setDownloadingId] = useState<number | null>(null); // Track which asset is being downloaded

  /**
   * Fetch materials from the API
   */
  const fetchMaterials = async () => {
    if (!classId) {
      setError('Class ID is required'); // Set error if no classId
      setLoading(false);
      return;
    }

    setLoading(true); // Set loading state
    setError(''); // Clear previous error

    try {
      // Fetch materials from API endpoint
      const response = await apiClient.get<MaterialsResponse>(`/v1/student/classes/${classId}/materials`);
      
      if (response.data.success) {
        setMaterials(response.data.materials); // Store materials data
      } else {
        setError('Failed to load materials.'); // Set error message
      }
    } catch (err: any) {
      console.error('Failed to fetch materials:', err); // Log error
      
      // Handle different error scenarios
      if (err?.response?.status === 403) {
        setError('You do not have access to materials for this class.'); // Forbidden error
      } else if (err?.response?.status === 404) {
        setError('Class not found.'); // Not found error
      } else {
        setError(err?.response?.data?.message || 'Failed to load materials. Please try again later.'); // Generic error
      }
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  // Fetch materials on component mount
  useEffect(() => {
    fetchMaterials();
  }, [classId]); // Re-fetch when classId changes

  /**
   * Handle downloading an asset
   * @param assetId - The asset ID to download
   * @param fileName - The file name for download
   */
  const handleDownload = async (assetId: number, fileName: string) => {
    setDownloadingId(assetId); // Set downloading state for this asset

    try {
      // Make request to download endpoint
      const response = await apiClient.get(`/v1/student/assets/${assetId}/download`, {
        responseType: 'blob', // Important: get response as blob for file download
      });

      // Create blob URL for download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Create temporary link element for download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName); // Set download filename
      document.body.appendChild(link); // Append to body
      link.click(); // Trigger download
      
      // Clean up
      link.parentNode?.removeChild(link); // Remove link from DOM
      window.URL.revokeObjectURL(url); // Revoke blob URL

      toast.success('Download started'); // Show success toast
    } catch (err: any) {
      console.error('Failed to download asset:', err); // Log error
      toast.error('Failed to download file. Please try again.'); // Show error toast
    } finally {
      setDownloadingId(null); // Clear downloading state
    }
  };

  /**
   * Handle navigation back to My Classes
   */
  const handleBack = () => {
    navigate('/student/courses');
  };

  /**
   * Count total assets across all sections
   */
  const totalAssets = materials.reduce((total, section) => {
    return total + section.lessons.reduce((lessonTotal, lesson) => {
      return lessonTotal + lesson.assets.length;
    }, 0);
  }, 0);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading study materials...</span>
      </div>
    );
  }

  // Show error state
  if (error && materials.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Classes
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchMaterials}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Classes
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Study Materials</h1>
          <p className="text-muted-foreground">
            {totalAssets} {totalAssets === 1 ? 'file' : 'files'} available
          </p>
        </div>
      </div>

      {/* No materials state */}
      {materials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No study materials available for this class yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Check back later for updates.</p>
          </CardContent>
        </Card>
      ) : (
        /* Materials grouped by section using Accordion */
        <Accordion type="multiple" defaultValue={materials.map(s => `section-${s.id}`)} className="space-y-4">
          {materials.map((section) => (
            <AccordionItem key={section.id} value={`section-${section.id}`} className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <span className="font-semibold">{section.title}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({section.lessons.reduce((total, lesson) => total + lesson.assets.length, 0)} files)
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-4">
                  {section.lessons.map((lesson) => (
                    <div key={lesson.id} className="space-y-2">
                      {/* Lesson title */}
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {lesson.title}
                      </h4>
                      
                      {/* Assets list */}
                      <div className="space-y-2 pl-6">
                        {lesson.assets.map((asset) => (
                          <div
                            key={asset.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* File type icon */}
                              {getFileIcon(asset.file_type)}
                              
                              {/* File info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{asset.file_name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className={getBadgeColor(asset.file_type)}>
                                    {asset.file_type.toUpperCase()}
                                  </Badge>
                                  <span>{formatFileSize(asset.file_size)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Download button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(asset.id, asset.file_name)}
                              disabled={downloadingId === asset.id}
                              className="ml-4 flex-shrink-0"
                            >
                              {downloadingId === asset.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}