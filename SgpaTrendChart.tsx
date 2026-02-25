/**
 * SgpaTrendChart.tsx - Reusable SGPA trend graph (AreaChart).
 * Renders an area chart showing SGPA progression across semesters.
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
} from "recharts"; // Import Recharts primitives used to draw the chart.

export type SgpaTrendPoint = {
  semesterLabel: string; // X-axis label for the semester (e.g., "Sem 1").
  sgpa: number; // Y-axis value representing SGPA.
};

type SgpaTrendChartProps = {
  data: SgpaTrendPoint[]; // Array of SGPA points.
  height?: number; // Optional chart height.
};

const SgpaTrendChart: React.FC<SgpaTrendChartProps> = ({ data, height = 220 }) => {
  return (
    <div className="w-full"> {/* Ensure full width for responsive chart container. */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}> {/* Bind chart to provided dataset. */}
          <CartesianGrid strokeDasharray="3 3" /> {/* Add dashed grid for readability. */}
          <XAxis dataKey="semesterLabel" /> {/* Map x-axis to semesterLabel. */}
          <YAxis domain={[0, 10]} /> {/* Constrain SGPA to typical 0-10 range. */}
          <Tooltip /> {/* Show tooltip values on hover. */}
          <Area
            type="monotone" // Draw smooth curve.
            dataKey="sgpa" // Plot sgpa values.
            stroke="#7C3AED" // Line color (purple).
            fill="#7C3AED" // Fill color (purple).
            fillOpacity={0.2} // Make the fill semi-transparent.
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SgpaTrendChart; // Export chart component.
