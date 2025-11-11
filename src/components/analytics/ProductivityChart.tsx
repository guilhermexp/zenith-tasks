'use client';

import React from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface ProductivityChartProps {
  data: DataPoint[];
  title?: string;
  color?: string;
  maxValue?: number;
}

export const ProductivityChart: React.FC<ProductivityChartProps> = ({
  data,
  title,
  color = '#737373', // neutral-500
  maxValue,
}) => {
  if (!data || data.length === 0) {
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

  const max = maxValue || Math.max(...data.map((d) => d.value));
  const chartHeight = 200;
  const barWidth = Math.max(40, Math.min(80, 100 / data.length));
  const spacing = 10;

  return (
    <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-6">
      {title && (
        <h3 className="text-lg font-semibold text-neutral-100 mb-6">{title}</h3>
      )}

      <div className="relative" style={{ height: chartHeight + 60 }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-10 flex flex-col justify-between text-xs text-neutral-500">
          <span>{max}</span>
          <span>{Math.round(max * 0.75)}</span>
          <span>{Math.round(max * 0.5)}</span>
          <span>{Math.round(max * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-10 h-full">
          <svg
            width="100%"
            height={chartHeight}
            className="overflow-visible"
            role="img"
            aria-label={`Gráfico de barras: ${title || 'Produtividade'}`}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={i}
                x1="0"
                y1={chartHeight * (1 - ratio)}
                x2="100%"
                y2={chartHeight * (1 - ratio)}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
              />
            ))}

            {/* Bars */}
            {data.map((point, index) => {
              const barHeight = (point.value / max) * chartHeight;
              const x = (index * (barWidth + spacing)) + spacing;
              const y = chartHeight - barHeight;

              return (
                <g key={index}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    opacity="0.8"
                    rx="4"
                    className="transition-all duration-300 hover:opacity-100"
                    aria-label={`${point.label}: ${point.value}`}
                  />

                  {/* Value label on hover */}
                  <title>{`${point.label}: ${point.value}`}</title>
                </g>
              );
            })}
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-start gap-2 mt-2">
            {data.map((point, index) => (
              <div
                key={index}
                className="text-xs text-neutral-500 truncate"
                style={{
                  width: `${barWidth}px`,
                  marginLeft: index === 0 ? `${spacing}px` : '0',
                  marginRight: spacing < 10 ? `${spacing}px` : '10px'
                }}
                title={point.label}
              >
                {point.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductivityChart;
