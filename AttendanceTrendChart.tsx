/**
 * AttendanceTrendChart.tsx - Reusable attendance trend graph (AreaChart).
 * This component renders a Recharts AreaChart inside a ResponsiveContainer.
 */

import React from "react"; // Import React for JSX support.
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"; // Import Recharts primitives used to draw the area graph.

export type AttendanceTrendPoint = {
  label: string; // Human readable x-axis label (e.g., month name or week).
  attendance: number; // Attendance percentage value for the point.
};

type AttendanceTrendChartProps = {
  data: AttendanceTrendPoint[]; // Trend data points to plot.
  height?: number; // Optional chart height in pixels.
};

const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({ data, height = 220 }) => {
  return (
    <div className="w-full"> {/* Ensure the chart stretches full width. */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}> {/* Bind chart to provided dataset. */}
          <CartesianGrid strokeDasharray="3 3" /> {/* Add dashed grid for readability. */}
          <XAxis dataKey="label" /> {/* Map x-axis to the label field. */}
          <YAxis domain={[0, 100]} /> {/* Constrain y-axis to percentage range. */}
          <Tooltip /> {/* Show tooltip on hover. */}
          <Area
            type="monotone" // Smooth curve between points.
            dataKey="attendance" // Plot the attendance field.
            stroke="#1E3A8A" // Line color.
            fill="#1E3A8A" // Fill color.
            fillOpacity={0.2} // Slight transparency for fill.
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttendanceTrendChart; // Export component for use in pages.
