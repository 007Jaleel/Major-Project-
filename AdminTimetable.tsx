/**
 * AdminTimetable.tsx
 *
 * Admin page for customizing timetable with drag-and-drop interface.
 * Uses @dnd-kit for drag-and-drop physics.
 * Explicit period-based grid layout with col-span for proper rendering.
 * Monday-Thursday: 6 periods + break + lunch (43 columns total)
 * Friday: Extended lunch, shorter afternoon periods
 * 
 * Phase 2: Database persistence with semester tabs and department selector
 */

import React, { useState, useCallback, useMemo, useEffect } from "react"; // Import React hooks.
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  rectIntersection,
} from "@dnd-kit/core"; // Import dnd-kit hooks and components.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components.
import { Button } from "@/components/ui/button"; // Import Button component.
import { Input } from "@/components/ui/input"; // Import Input component.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components.
import { Label } from "@/components/ui/label"; // Import Label component.
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; // Import Tabs components.
import { Calendar, Plus, GripVertical, Clock, Save, Loader2 } from "lucide-react"; // Import icons.
import { CSS } from "@dnd-kit/utilities"; // Import CSS utilities for transform styles.
import { toast } from "sonner"; // Import toast for notifications.
import apiClient from "@/lib/apiClient"; // Import API client for backend calls.

// Type definitions for timetable blocks
type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"; // Days of the week.

interface UIBlock {
  id: string; // Unique identifier for the block.
  subject: string; // Subject name.
  duration_mins: number; // Duration in minutes.
}

interface TimetableBlock extends UIBlock {
  day: Weekday; // Day of the week.
  start_time: string; // Start time in HH:MM format.
}

// API response types
interface TimetableRow {
  id: number;
  department: string;
  semester: number;
  day_of_week: string;
  period_number: number;
  subject_name: string;
  duration_periods: number;
  teacher_id: number | null;
}

interface SyncResponse {
  success: boolean;
  message: string;
  deleted: number;
  inserted: number;
  total: number;
}

// Constants for 10-minute interval timetable grid
const DAYS: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]; // All weekdays.
const TOTAL_COLUMNS = 43; // 43 columns total for the grid.

// Valid departments
const DEPARTMENTS = [
  { value: "CT", label: "Computer Technology (CT)" },
  { value: "EC", label: "Electronics & Communication (EC)" },
  { value: "MECH", label: "Mechanical Engineering (MECH)" },
];

// Duration options for block creation
const DURATION_OPTIONS = [
  { value: 50, label: "50 minutes (Friday period)" },
  { value: 60, label: "60 minutes (Standard period)" },
  { value: 120, label: "2 hours (Lab)" },
  { value: 180, label: "3 hours (Long lab)" },
];

/**
 * Period segment definition for explicit row rendering.
 * Each segment has a start time, column span, and type.
 */
interface PeriodSegment {
  id: string; // Unique identifier for the segment.
  label: string; // Display label (P1, Break, Lunch, etc.).
  startTime: string; // Start time in HH:MM format.
  colSpan: number; // Number of grid columns to span.
  isBreak?: boolean; // Whether this is a break period.
  isLunch?: boolean; // Whether this is a lunch period.
  isDropZone?: boolean; // Whether this accepts dropped blocks.
  periodNumber?: number; // Period number (1-6) for DB mapping.
}

/**
 * Standard period segments for Monday-Thursday.
 * Total: 6+6+2+6+4+6+6+6+1 = 43 columns
 */
const STANDARD_SEGMENTS: PeriodSegment[] = [
  { id: "P1", label: "P1", startTime: "09:20", colSpan: 6, isDropZone: true, periodNumber: 1 },
  { id: "P2", label: "P2", startTime: "10:20", colSpan: 6, isDropZone: true, periodNumber: 2 },
  { id: "Break", label: "Break", startTime: "11:20", colSpan: 2, isBreak: true },
  { id: "P3", label: "P3", startTime: "11:40", colSpan: 6, isDropZone: true, periodNumber: 3 },
  { id: "Lunch", label: "Lunch", startTime: "12:40", colSpan: 4, isLunch: true },
  { id: "P4", label: "P4", startTime: "13:20", colSpan: 6, isDropZone: true, periodNumber: 4 },
  { id: "P5", label: "P5", startTime: "14:20", colSpan: 6, isDropZone: true, periodNumber: 5 },
  { id: "P6", label: "P6", startTime: "15:20", colSpan: 6, isDropZone: true, periodNumber: 6 },
  { id: "Pad", label: "", startTime: "16:20", colSpan: 1 }, // Dummy padding column.
];

/**
 * Friday period segments with extended lunch and shorter afternoon periods.
 * Total: 6+6+2+6+8+5+5+5 = 43 columns
 */
const FRIDAY_SEGMENTS: PeriodSegment[] = [
  { id: "P1", label: "P1", startTime: "09:20", colSpan: 6, isDropZone: true, periodNumber: 1 },
  { id: "P2", label: "P2", startTime: "10:20", colSpan: 6, isDropZone: true, periodNumber: 2 },
  { id: "Break", label: "Break", startTime: "11:20", colSpan: 2, isBreak: true },
  { id: "P3", label: "P3", startTime: "11:40", colSpan: 6, isDropZone: true, periodNumber: 3 },
  { id: "Lunch", label: "Lunch", startTime: "12:40", colSpan: 8, isLunch: true }, // Extended Friday lunch (80 mins).
  { id: "P4", label: "P4", startTime: "14:00", colSpan: 5, isDropZone: true, periodNumber: 4 }, // 50 mins.
  { id: "P5", label: "P5", startTime: "14:50", colSpan: 5, isDropZone: true, periodNumber: 5 }, // 50 mins.
  { id: "P6", label: "P6", startTime: "15:40", colSpan: 5, isDropZone: true, periodNumber: 6 }, // 50 mins.
];

// Subject-to-color mapping for consistent visual grouping
const SUBJECT_COLOR_MAP: Record<string, string> = {}; // Cache for assigned colors.
const SUBJECT_COLORS = [
  "bg-blue-500 border-blue-600 text-white", // Blue
  "bg-emerald-500 border-emerald-600 text-white", // Emerald
  "bg-purple-500 border-purple-600 text-white", // Purple
  "bg-orange-500 border-orange-600 text-white", // Orange
  "bg-pink-500 border-pink-600 text-white", // Pink
  "bg-cyan-500 border-cyan-600 text-white", // Cyan
  "bg-amber-500 border-amber-600 text-white", // Amber
  "bg-rose-500 border-rose-600 text-white", // Rose
  "bg-indigo-500 border-indigo-600 text-white", // Indigo
  "bg-teal-500 border-teal-600 text-white", // Teal
];
let colorIndex = 0; // Counter for cycling through colors.

/**
 * Get consistent color for a subject based on its name.
 * Same subject always gets the same color across all blocks.
 */
function getSubjectColor(subject: string): string {
  const normalizedSubject = subject.toUpperCase().trim(); // Normalize for consistent lookup.
  if (!SUBJECT_COLOR_MAP[normalizedSubject]) {
    SUBJECT_COLOR_MAP[normalizedSubject] = SUBJECT_COLORS[colorIndex % SUBJECT_COLORS.length]; // Assign next color.
    colorIndex++; // Increment for next unique subject.
  }
  return SUBJECT_COLOR_MAP[normalizedSubject]; // Return assigned color.
}

/**
 * Generate a unique ID for blocks.
 */
function generateId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Generate unique ID.
}

/**
 * Get period number from start_time using segment mapping.
 * Returns the period number (1-6) for a given start time and day.
 */
function getPeriodNumber(day: Weekday, startTime: string): number {
  const segments = day === "Friday" ? FRIDAY_SEGMENTS : STANDARD_SEGMENTS; // Select segments.
  const segment = segments.find((s) => s.startTime === startTime && s.isDropZone); // Find matching segment.
  return segment?.periodNumber || 1; // Return period number or default to 1.
}

/**
 * Get start_time from period number and day.
 * Returns the start time string for a given period number and day.
 */
function getStartTimeFromPeriod(day: Weekday, periodNumber: number): string {
  const segments = day === "Friday" ? FRIDAY_SEGMENTS : STANDARD_SEGMENTS; // Select segments.
  const segment = segments.find((s) => s.periodNumber === periodNumber); // Find matching segment.
  return segment?.startTime || "09:20"; // Return start time or default.
}

/**
 * DraggableBlock - A draggable block component for timetable.
 * Fills its container with w-full h-full when in timetable.
 */
function DraggableBlock({ 
  block, 
  isOverlay = false,
  isInTimetable = false,
}: { 
  block: UIBlock | TimetableBlock; 
  isOverlay?: boolean;
  isInTimetable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: block, // Attach block data for drag events.
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform), // Apply transform for drag movement.
    opacity: isDragging ? 0.5 : 1, // Reduce opacity while dragging.
  };

  const subjectColor = getSubjectColor(block.subject); // Get consistent color for subject.

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${subjectColor} border rounded-md cursor-grab active:cursor-grabbing
        flex items-center gap-2 text-sm font-medium
        ${isOverlay ? "shadow-lg ring-2 ring-primary" : "shadow"}
        ${isDragging ? "z-50" : ""}
        ${isInTimetable 
          ? "w-full h-full min-h-[60px] p-2 justify-center" // Fill container when in timetable grid.
          : "p-2" // Standard padding in collection box.
        }
      `}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4 shrink-0 opacity-70" /> {/* Drag handle icon. */}
      <div className="flex-1 min-w-0 text-center">
        <div className="truncate font-semibold">{block.subject}</div>
        <div className="text-xs opacity-80 flex items-center justify-center gap-1">
          <Clock className="h-3 w-3" />
          {block.duration_mins}m
          {"day" in block && ` • ${(block as TimetableBlock).day.slice(0, 3)}`}
        </div>
      </div>
    </div>
  );
}

/**
 * PeriodDropZone - A droppable zone for a period in the timetable.
 * Accepts dropped blocks and displays them filling the full zone.
 */
function PeriodDropZone({ 
  day, 
  segment,
  children,
}: { 
  day: Weekday; 
  segment: PeriodSegment;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell|${day}|${segment.startTime}`, // Keep consistent ID format for drag handling.
    data: { day, start_time: segment.startTime }, // Attach cell data for drop events.
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[60px] border border-border/50 rounded-md relative overflow-visible
        ${isOver ? "bg-primary/20 border-primary ring-2 ring-primary/50" : "bg-background/50"}
        transition-all duration-150
      `}
      style={{ gridColumn: `span ${segment.colSpan} / span ${segment.colSpan}` }}
    >
      {children}
    </div>
  );
}

/**
 * StaticCell - Non-droppable cell for breaks and lunch.
 * Renders once per row with proper styling.
 */
function StaticCell({ segment }: { segment: PeriodSegment }) {
  return (
    <div
      className={`
        rounded-md flex items-center justify-center text-xs font-medium min-h-[60px]
        ${segment.isBreak 
          ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300" 
          : ""
        }
        ${segment.isLunch 
          ? "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300" 
          : ""
        }
      `}
      style={{ gridColumn: `span ${segment.colSpan} / span ${segment.colSpan}` }}
    >
      {segment.label}
    </div>
  );
}

/**
 * ScheduleHeaderRow - Renders the period headers with time ranges.
 * Uses explicit segments to match the grid layout.
 */
function ScheduleHeaderRow({ isFriday }: { isFriday?: boolean }) {
  const segments = isFriday ? FRIDAY_SEGMENTS : STANDARD_SEGMENTS; // Select segments based on day.

  return (
    <div className="grid grid-cols-[80px_repeat(43,minmax(0,1fr))] gap-1 mb-2">
      {/* Empty corner cell for day label */}
      <div className="font-medium text-sm text-muted-foreground"></div>
      
      {/* Period headers matching the segment layout */}
      {segments.map((segment) => (
        <div
          key={segment.id}
          style={{ gridColumn: `span ${segment.colSpan} / span ${segment.colSpan}` }}
          className={`
            text-xs font-semibold text-center py-2 rounded min-h-[40px] flex flex-col justify-center
            ${segment.isBreak ? "bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200" : ""}
            ${segment.isLunch ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200" : ""}
            ${!segment.isBreak && !segment.isLunch && segment.isDropZone 
              ? "bg-primary/10 text-primary" 
              : ""
            }
          `}
        >
          <div>{segment.label}</div>
          {segment.startTime && segment.colSpan > 1 && (
            <div className="text-[10px] opacity-70">
              {formatTimeRange(segment.startTime, segment.colSpan)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Format time range for header display.
 * Calculates end time based on start time and column span.
 */
function formatTimeRange(startTime: string, colSpan: number): string {
  const [hours, minutes] = startTime.split(":").map(Number); // Parse start time.
  const durationMins = colSpan * 10; // Each column = 10 minutes.
  const endTotalMins = hours * 60 + minutes + durationMins; // Calculate end time in minutes.
  const endHours = Math.floor(endTotalMins / 60); // Calculate end hours.
  const endMins = endTotalMins % 60; // Calculate end minutes.
  
  const formatAMPM = (h: number, m: number) => {
    const ampm = h >= 12 ? "PM" : "AM"; // Determine AM/PM.
    const displayH = h % 12 || 12; // Convert to 12-hour format.
    return `${displayH}:${m.toString().padStart(2, "0")} ${ampm}`; // Format with AM/PM.
  };
  
  return `${formatAMPM(hours, minutes)} - ${formatAMPM(endHours, endMins)}`; // Return formatted range.
}

/**
 * DayRow - Renders a single day row with explicit period segments.
 * No more 43-cell loop - each period is explicitly rendered.
 */
function DayRow({
  day,
  timetable,
  renderBlock,
}: {
  day: Weekday;
  timetable: TimetableBlock[];
  renderBlock: (block: TimetableBlock) => React.ReactNode;
}) {
  const isFriday = day === "Friday"; // Check if Friday for different segments.
  const segments = isFriday ? FRIDAY_SEGMENTS : STANDARD_SEGMENTS; // Select appropriate segments.
  
  // Filter blocks for this day
  const dayBlocks = useMemo(() => {
    return timetable.filter((b) => b.day === day); // Get blocks for this day only.
  }, [timetable, day]);

  return (
    <div className="grid grid-cols-[80px_repeat(43,minmax(0,1fr))] gap-1 mb-1">
      {/* Day label */}
      <div className="font-medium text-sm flex items-center justify-start pr-2">
        {day}
      </div>
      
      {/* Explicit period segments - NO 43-cell loop */}
      {segments.map((segment) => {
        // Render break cell (static, non-droppable)
        if (segment.isBreak) {
          return <StaticCell key={segment.id} segment={segment} />;
        }
        
        // Render lunch cell (static, non-droppable)
        if (segment.isLunch) {
          return <StaticCell key={segment.id} segment={segment} />;
        }
        
        // Render padding cell (empty, non-droppable)
        if (!segment.isDropZone) {
          return (
            <div
              key={segment.id}
              className="bg-muted/20 rounded min-h-[60px]"
              style={{ gridColumn: `span ${segment.colSpan} / span ${segment.colSpan}` }}
            />
          );
        }
        
        // Render drop zone for periods
        // Find blocks that start at this period's start time
        const blocksInPeriod = dayBlocks.filter((b) => b.start_time === segment.startTime);
        
        return (
          <PeriodDropZone key={segment.id} day={day} segment={segment}>
            {blocksInPeriod.map((block) => renderBlock(block))}
          </PeriodDropZone>
        );
      })}
    </div>
  );
}

/**
 * TimetableGrid - The main timetable grid component.
 * Uses explicit period-based rows instead of 43-cell loop.
 */
function TimetableGrid({
  timetable,
  renderBlock,
}: {
  timetable: TimetableBlock[];
  renderBlock: (block: TimetableBlock) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      {/* Schedule header row */}
      <ScheduleHeaderRow />
      
      {/* Day rows with explicit period segments */}
      {DAYS.map((day) => (
        <DayRow
          key={day}
          day={day}
          timetable={timetable}
          renderBlock={renderBlock}
        />
      ))}
      
      {/* Friday header row (for reference, showing Friday layout) */}
      <div className="mt-4 pt-4 border-t">
        <div className="text-sm font-medium mb-2 text-muted-foreground">Friday Schedule (Extended Lunch)</div>
        <ScheduleHeaderRow isFriday />
      </div>
    </div>
  );
}

/**
 * AdminTimetable - Main component for timetable customization.
 * Phase 2: Includes semester tabs, department selector, and API persistence.
 */
export default function AdminTimetable() {
  // State for semester and department selection
  const [selectedSemester, setSelectedSemester] = useState<number>(1); // Current semester (1-6).
  const [selectedDepartment, setSelectedDepartment] = useState<string>("CT"); // Current department.

  // State for collection box (unassigned blocks)
  const [collectionBox, setCollectionBox] = useState<UIBlock[]>([]); // Unassigned blocks.

  // State for timetable (assigned blocks)
  const [timetable, setTimetable] = useState<TimetableBlock[]>([]); // Assigned blocks.

  // State for block creator form
  const [newSubject, setNewSubject] = useState(""); // Subject input value.
  const [newDuration, setNewDuration] = useState<number>(60); // Duration select value.

  // State for active drag item (for overlay)
  const [activeBlock, setActiveBlock] = useState<UIBlock | TimetableBlock | null>(null); // Currently dragged block.

  // State for loading and saving
  const [loading, setLoading] = useState<boolean>(false); // Loading state for fetch.
  const [saving, setSaving] = useState<boolean>(false); // Saving state for sync.

  /**
   * Fetch timetable from API when semester or department changes.
   * Converts DB rows to TimetableBlock format.
   */
  const fetchTimetable = useCallback(async () => {
    setLoading(true); // Set loading state.
    try {
      const response = await apiClient.get<{ success: boolean; data: TimetableRow[] }>(
        `/v1/timetables?department=${selectedDepartment}&semester=${selectedSemester}`
      );

      if (response.data.success && response.data.data) {
        // Convert DB rows to TimetableBlock format
        const blocks: TimetableBlock[] = response.data.data.map((row) => ({
          id: `db-${row.id}`, // Prefix DB ID to distinguish from local blocks.
          subject: row.subject_name,
          duration_mins: row.duration_periods * 60, // Convert periods to minutes.
          day: row.day_of_week as Weekday,
          start_time: getStartTimeFromPeriod(row.day_of_week as Weekday, row.period_number),
        }));
        setTimetable(blocks); // Update timetable state.
        setCollectionBox([]); // Clear collection box on fetch.
      }
    } catch (error) {
      console.error("Failed to fetch timetable:", error); // Log error.
      toast.error("Failed to load timetable"); // Show error toast.
      setTimetable([]); // Clear timetable on error.
    } finally {
      setLoading(false); // Clear loading state.
    }
  }, [selectedDepartment, selectedSemester]);

  /**
   * Save timetable to API via bulk sync.
   * Converts TimetableBlock array to DB format.
   */
  const saveTimetable = useCallback(async () => {
    setSaving(true); // Set saving state.
    try {
      // Convert TimetableBlock array to API format
      const blocks = timetable.map((block) => ({
        day_of_week: block.day,
        period_number: getPeriodNumber(block.day, block.start_time),
        subject_name: block.subject,
        duration_periods: Math.ceil(block.duration_mins / 60), // Convert minutes to periods.
        teacher_id: null, // Not implemented yet.
      }));

      const response = await apiClient.post<SyncResponse>("/v1/timetables/sync", {
        department: selectedDepartment,
        semester: selectedSemester,
        blocks,
      });

      if (response.data.success) {
        toast.success(response.data.message); // Show success toast.
      }
    } catch (error) {
      console.error("Failed to save timetable:", error); // Log error.
      toast.error("Failed to save timetable"); // Show error toast.
    } finally {
      setSaving(false); // Clear saving state.
    }
  }, [timetable, selectedDepartment, selectedSemester]);

  // Fetch timetable when semester or department changes
  useEffect(() => {
    fetchTimetable(); // Fetch on mount and when filters change.
  }, [fetchTimetable]);

  /**
   * Handle semester tab change.
   * Clears state and fetches new timetable.
   */
  const handleSemesterChange = (value: string) => {
    const newSemester = parseInt(value, 10); // Parse semester number.
    setSelectedSemester(newSemester); // Update semester state.
    setTimetable([]); // Clear timetable.
    setCollectionBox([]); // Clear collection box.
    // fetchTimetable will be called by useEffect due to state change.
  };

  /**
   * Handle department change.
   * Clears state and fetches new timetable.
   */
  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value); // Update department state.
    setTimetable([]); // Clear timetable.
    setCollectionBox([]); // Clear collection box.
    // fetchTimetable will be called by useEffect due to state change.
  };

  /**
   * Collision check result type.
   * Returns ok=true if drop is valid, or error details if invalid.
   */
  interface CollisionCheckResult {
    ok: boolean;
    reason?: 'boundary' | 'overlap';
    collidedWithSubject?: string;
  }

  /**
   * Check if a drop is valid (no boundary overflow or overlap).
   * @param targetDay - Day being dropped into
   * @param targetStartTime - Start time of target period
   * @param droppedBlock - The block being dropped
   * @param excludeBlockId - Block ID to exclude from overlap check (for moves within grid)
   */
  const checkDropCollision = useCallback((
    targetDay: Weekday,
    targetStartTime: string,
    droppedBlock: UIBlock | TimetableBlock,
    excludeBlockId?: string
  ): CollisionCheckResult => {
    // Calculate proposed period range
    const targetStartPeriod = getPeriodNumber(targetDay, targetStartTime); // Get period number (1-6).
    const durationPeriods = Math.ceil(droppedBlock.duration_mins / 60); // Convert minutes to periods.
    const targetEndPeriod = targetStartPeriod + durationPeriods - 1; // Calculate end period.

    // Boundary check: block must not exceed period 6
    if (targetEndPeriod > 6) {
      return { ok: false, reason: 'boundary' }; // Reject if block spills beyond P6.
    }

    // Overlap check: filter blocks on same day, exclude the dragged block itself
    const sameDayBlocks = timetable.filter((b) => b.day === targetDay && b.id !== excludeBlockId);
    
    for (const existingBlock of sameDayBlocks) {
      // Calculate existing block's period range
      const existingStartPeriod = getPeriodNumber(existingBlock.day, existingBlock.start_time);
      const existingDurationPeriods = Math.ceil(existingBlock.duration_mins / 60);
      const existingEndPeriod = existingStartPeriod + existingDurationPeriods - 1;

      // Check for range intersection: ranges overlap if neither is completely before/after the other
      const rangesOverlap = !(targetEndPeriod < existingStartPeriod || targetStartPeriod > existingEndPeriod);
      
      if (rangesOverlap) {
        return { ok: false, reason: 'overlap', collidedWithSubject: existingBlock.subject }; // Reject with collided subject.
      }
    }

    return { ok: true }; // Drop is valid.
  }, [timetable]);

  /**
   * Handle drag start - track active item for overlay.
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event; // Get active draggable.
    const block = active.data.current as UIBlock | TimetableBlock; // Get block data.
    setActiveBlock(block); // Store for overlay.
  }, []);

  /**
   * Handle drag end - support three actions with collision validation:
   * a) Collection Box -> Timetable Grid (with boundary + overlap check)
   * b) Timetable Grid -> Collection Box (remove day and start_time)
   * c) Timetable Grid -> Different slot in Timetable Grid (with boundary + overlap check)
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event; // Get drag event data.
    setActiveBlock(null); // Clear active block.

    if (!over) return; // No drop target - do nothing.

    const blockId = active.id as string; // Get block ID.
    const overId = over.id as string; // Get drop target ID.

    // CASE A & C: Dropping into a timetable cell (from collection or moving within grid)
    if (overId.startsWith("cell|")) {
      const [, day, startTime] = overId.split("|"); // Parse cell info.
      const targetDay = day as Weekday; // Cast to Weekday type.

      // Find the block being dragged - check timetable first, then collection box
      const existingTimetableIndex = timetable.findIndex((b) => b.id === blockId);
      const collectionIndex = collectionBox.findIndex((b) => b.id === blockId);
      
      // Get the block object for collision check
      let droppedBlock: UIBlock | TimetableBlock | undefined;
      if (existingTimetableIndex !== -1) {
        droppedBlock = timetable[existingTimetableIndex]; // Block from timetable.
      } else if (collectionIndex !== -1) {
        droppedBlock = collectionBox[collectionIndex]; // Block from collection.
      }

      if (!droppedBlock) return; // Block not found - should not happen.

      // Run collision check before any state mutation
      const collisionResult = checkDropCollision(
        targetDay,
        startTime,
        droppedBlock,
        blockId // Exclude dragged block from overlap check (for moves within grid).
      );

      if (!collisionResult.ok) {
        // Rejection: show appropriate toast based on failure reason
        if (collisionResult.reason === 'boundary') {
          toast.error('Invalid Move: Block exceeds the maximum periods for the day.'); // Boundary overflow.
        } else if (collisionResult.reason === 'overlap') {
          toast.error(`Collision Detected: This slot is already occupied by ${collisionResult.collidedWithSubject}.`); // Overlap.
        }
        return; // Abort drop - no state changes.
      }

      // Collision check passed - proceed with drop logic
      
      // CASE C: Moving within timetable - update day and start_time
      if (existingTimetableIndex !== -1) {
        const newTimetable = [...timetable]; // Clone array.
        newTimetable[existingTimetableIndex] = {
          ...timetable[existingTimetableIndex],
          day: targetDay, // Update day.
          start_time: startTime, // Update start time.
        };
        setTimetable(newTimetable); // Update state.
        return; // Exit early.
      }

      // CASE A: Move from collection box to timetable
      if (collectionIndex !== -1) {
        const block = collectionBox[collectionIndex]; // Get block.
        
        // Remove from collection box
        const newCollectionBox = [...collectionBox]; // Clone array.
        newCollectionBox.splice(collectionIndex, 1); // Remove block.
        setCollectionBox(newCollectionBox); // Update state.

        // Add to timetable with day and start_time
        const newTimetableBlock: TimetableBlock = {
          ...block,
          day: targetDay, // Add day.
          start_time: startTime, // Add start time.
        };
        setTimetable([...timetable, newTimetableBlock]); // Update state.
      }
    }

    // CASE B: Dropping from timetable back into collection box
    if (overId === "collection-box") {
      const timetableIndex = timetable.findIndex((b) => b.id === blockId); // Find in timetable.
      if (timetableIndex !== -1) {
        const block = timetable[timetableIndex]; // Get block.
        
        // Remove from timetable
        const newTimetable = [...timetable]; // Clone array.
        newTimetable.splice(timetableIndex, 1); // Remove block.
        setTimetable(newTimetable); // Update state.

        // Add back to collection box (strip timetable-specific fields)
        const { day: _, start_time: __, ...uiBlock } = block; // Remove day and start_time.
        setCollectionBox([...collectionBox, uiBlock]); // Update state.
      }
    }
  }, [collectionBox, timetable, checkDropCollision]);

  /**
   * Create a new block and add to collection box.
   * Color is automatically assigned via getSubjectColor().
   */
  const handleCreateBlock = useCallback(() => {
    if (!newSubject.trim()) return; // Validate subject name.

    const block: UIBlock = {
      id: generateId(), // Generate unique ID.
      subject: newSubject.trim(), // Set subject name.
      duration_mins: newDuration, // Set duration.
    };

    setCollectionBox([...collectionBox, block]); // Add to collection box (color assigned on render).
    setNewSubject(""); // Reset form.
    setNewDuration(60); // Reset duration.
  }, [newSubject, newDuration, collectionBox]);

  /**
   * Delete a block from collection box.
   */
  const handleDeleteFromCollection = useCallback((blockId: string) => {
    setCollectionBox(collectionBox.filter((b) => b.id !== blockId)); // Remove block.
  }, [collectionBox]);

  /**
   * Delete a block from timetable.
   */
  const handleDeleteFromTimetable = useCallback((blockId: string) => {
    setTimetable(timetable.filter((b) => b.id !== blockId)); // Remove block.
  }, [timetable]);

  // Collection box droppable setup
  const { setNodeRef: setCollectionBoxRef, isOver: isOverCollection } = useDroppable({
    id: "collection-box", // Unique ID for collection box.
  });

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={rectIntersection}
    >
      <div className="space-y-6">
        {/* Header with Semester Tabs and Department Selector */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timetable Customization
                </CardTitle>
                {/* Save Button */}
                <Button 
                  onClick={saveTimetable} 
                  disabled={saving || loading}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "Saving..." : "Save Timetable"}
                </Button>
              </div>
              
              {/* Semester Tabs and Department Selector Row */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Semester Tabs */}
                <Tabs 
                  value={String(selectedSemester)} 
                  onValueChange={handleSemesterChange}
                  className="w-auto"
                >
                  <TabsList>
                    {[1, 2, 3, 4, 5, 6].map((sem) => (
                      <TabsTrigger key={sem} value={String(sem)}>
                        S{sem}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* Department Selector */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Department:</Label>
                  <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage timetable for <strong>Department: {selectedDepartment}</strong>,{" "}
              <strong>Semester: {selectedSemester}</strong>. Create subject blocks and drag them 
              into the timetable grid. Changes are saved when you click "Save Timetable".
            </p>
          </CardContent>
        </Card>

        {/* Block Creator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Subject Block</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="subject">Subject Name</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Mathematics, DS, OOP Lab"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
              </div>
              <div className="w-48 space-y-2">
                <Label>Duration</Label>
                <Select value={String(newDuration)} onValueChange={(v) => setNewDuration(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateBlock} disabled={!newSubject.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Block
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Same subject names get the same color automatically. Drag blocks to period zones in the grid.
            </p>
          </CardContent>
        </Card>

        {/* Collection Box */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unassigned Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={setCollectionBoxRef}
              className={`
                min-h-[100px] border-2 border-dashed rounded-lg p-4
                ${isOverCollection ? "border-primary bg-primary/5" : "border-border"}
                transition-colors
              `}
            >
              {collectionBox.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No blocks yet. Create a block above or drag from timetable.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {collectionBox.map((block) => (
                    <div key={block.id} className="relative group">
                      <DraggableBlock block={block} />
                      <button
                        onClick={() => handleDeleteFromCollection(block.id)}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timetable Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Weekly Timetable - {selectedDepartment} Semester {selectedSemester}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading timetable...</span>
              </div>
            ) : (
              <TimetableGrid
                timetable={timetable}
                renderBlock={(block) => {
                  // Calculate span multiplier: 60min = 1 period, 120min = 2 periods, 180min = 3 periods
                  const spanMultiplier = Math.ceil(block.duration_mins / 60);
                  // Grid uses gap-1 (0.25rem = 4px), compensate for gaps between spanned cells
                  const gapRem = 0.25;
                  
                  return (
                    <div 
                      key={block.id} 
                      className="relative group h-full"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        zIndex: 10,
                        // Width = 100% per period + gap compensation for internal gaps
                        width: `calc(${spanMultiplier * 100}% + ${(spanMultiplier - 1) * gapRem}rem)`,
                      }}
                    >
                      <DraggableBlock 
                        block={block} 
                        isInTimetable={true} // Enable full-width styling in timetable.
                      />
                      <button
                        onClick={() => handleDeleteFromTimetable(block.id)}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >
                        ×
                      </button>
                    </div>
                  );
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Unassigned: {collectionBox.length} blocks</span>
              <span>Scheduled: {timetable.length} blocks</span>
              <span>Grid: {TOTAL_COLUMNS} columns (explicit period layout)</span>
            </div>
          </CardContent>
        </Card>

        {/* Drag Overlay - shows item being dragged */}
        <DragOverlay>
          {activeBlock ? <DraggableBlock block={activeBlock} isOverlay /> : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}