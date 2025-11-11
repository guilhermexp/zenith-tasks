'use client';

import React from 'react';

interface TaskTypeData {
  type: string;
  count: number;
  color?: string;
}

interface TaskTypeBreakdownProps {
  data: Record<string, number> | TaskTypeData[];
  title?: string;
}

const DEFAULT_COLORS = [
  '#a855f7', // purple
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
];

export const TaskTypeBreakdown: React.FC<TaskTypeBreakdownProps> = ({
  data,
  title,
}) => {
  // Normalize data to array format
  const normalizedData: TaskTypeData[] = Array.isArray(data)
    ? data
    : Object.entries(data).map(([type, count], index) => ({
        type,
        count,
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      }));

  if (normalizedData.length === 0) {
    return (
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-6">
        {title && (
          <h3 className="text-lg font-semibold text-neutral-100 mb-4">{title}</h3>
        )}
        <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
          Sem dados para exibir
        </div>
      </div>
    );
  }

  const total = normalizedData.reduce((sum, item) => sum + item.count, 0);
  const size = 200;
  const strokeWidth = 40;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-6">
      {title && (
        <h3 className="text-lg font-semibold text-neutral-100 mb-6">{title}</h3>
      )}

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Donut Chart */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            className="transform -rotate-90"
            role="img"
            aria-label={`Gráfico de rosca: ${title || 'Tipos de Tarefa'}`}
          >
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
            />

            {/* Data segments */}
            {normalizedData.map((item, index) => {
              const percentage = item.count / total;
              const strokeDasharray = `${percentage * circumference} ${circumference}`;
              const strokeDashoffset = -currentOffset * circumference;
              currentOffset += percentage;

              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 hover:opacity-80"
                  aria-label={`${item.type}: ${item.count} (${Math.round(percentage * 100)}%)`}
                >
                  <title>{`${item.type}: ${item.count} (${Math.round(percentage * 100)}%)`}</title>
                </circle>
              );
            })}
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-neutral-100">{total}</span>
            <span className="text-xs text-neutral-500">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {normalizedData.map((item, index) => {
            const percentage = ((item.count / total) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
                  />
                  <span className="text-sm text-neutral-300 truncate">
                    {item.type}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-neutral-100">
                    {item.count}
                  </span>
                  <span className="text-xs text-neutral-500 w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TaskTypeBreakdown;
