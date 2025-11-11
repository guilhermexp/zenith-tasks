'use client';

import React from 'react';

interface HeatmapCell {
  day: string;
  hour: number;
  value: number; // 0-1, representing intensity
}

interface ProcrastinationHeatmapProps {
  data: HeatmapCell[];
  title?: string;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const ProcrastinationHeatmap: React.FC<ProcrastinationHeatmapProps> = ({
  data,
  title,
}) => {
  // Create a map for quick lookups
  const dataMap = new Map<string, number>();
  data.forEach((cell) => {
    const key = `${cell.day}-${cell.hour}`;
    dataMap.set(key, cell.value);
  });

  const getIntensityColor = (value: number): string => {
    if (value === 0) return 'rgba(255, 255, 255, 0.05)';
    if (value < 0.2) return 'rgba(239, 68, 68, 0.2)'; // red-500 low
    if (value < 0.4) return 'rgba(239, 68, 68, 0.4)';
    if (value < 0.6) return 'rgba(239, 68, 68, 0.6)';
    if (value < 0.8) return 'rgba(239, 68, 68, 0.8)';
    return 'rgba(239, 68, 68, 1)'; // red-500 high
  };

  const getCellValue = (day: string, hour: number): number => {
    const key = `${day}-${hour}`;
    return dataMap.get(key) || 0;
  };

  const getIntensityLabel = (value: number): string => {
    if (value === 0) return 'Sem dados';
    if (value < 0.2) return 'Muito baixa';
    if (value < 0.4) return 'Baixa';
    if (value < 0.6) return 'Média';
    if (value < 0.8) return 'Alta';
    return 'Muito alta';
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-6">
        {title && (
          <h3 className="text-lg font-semibold text-neutral-100 mb-4">{title}</h3>
        )}
        <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
          Sem dados de procrastinação para exibir
        </div>
      </div>
    );
  }

  const cellSize = 24;
  const cellGap = 2;

  return (
    <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-6">
      {title && (
        <h3 className="text-lg font-semibold text-neutral-100 mb-6">{title}</h3>
      )}

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 pr-2">
              <div style={{ height: cellSize }} /> {/* Spacer for hour labels */}
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="flex items-center justify-end text-xs text-neutral-500"
                  style={{ height: cellSize + cellGap }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex-1">
              {/* Hour labels */}
              <div className="flex gap-0.5 mb-2">
                {HOURS.filter((h) => h % 3 === 0).map((hour) => (
                  <div
                    key={hour}
                    className="text-xs text-neutral-500 text-center"
                    style={{ width: cellSize * 3 + cellGap * 2 }}
                  >
                    {hour.toString().padStart(2, '0')}h
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div
                className="grid gap-0.5"
                style={{
                  gridTemplateColumns: `repeat(${HOURS.length}, ${cellSize}px)`,
                  gridTemplateRows: `repeat(${DAYS.length}, ${cellSize}px)`,
                }}
                role="img"
                aria-label={`Mapa de calor: ${title || 'Padrões de Procrastinação'}`}
              >
                {DAYS.map((day) =>
                  HOURS.map((hour) => {
                    const value = getCellValue(day, hour);
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="rounded transition-all duration-200 hover:ring-2 hover:ring-purple-500 hover:ring-offset-1 hover:ring-offset-neutral-900"
                        style={{
                          backgroundColor: getIntensityColor(value),
                          width: cellSize,
                          height: cellSize,
                        }}
                        title={`${day} ${hour}:00 - ${getIntensityLabel(value)}`}
                        aria-label={`${day} ${hour}:00 - Intensidade: ${getIntensityLabel(value)}`}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="text-xs text-neutral-500">Menos</span>
            <div className="flex gap-1">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((value) => (
                <div
                  key={value}
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getIntensityColor(value) }}
                  title={getIntensityLabel(value)}
                />
              ))}
            </div>
            <span className="text-xs text-neutral-500">Mais</span>
          </div>

          <p className="mt-4 text-xs text-neutral-500 text-center">
            Células mais escuras indicam maior tendência à procrastinação naquele horário
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProcrastinationHeatmap;
