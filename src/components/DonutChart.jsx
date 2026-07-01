import React, { useState } from 'react';

export default function DonutChart({ data, totalLabel = 'Total' }) {
  const [hoveredData, setHoveredData] = useState(null);
  
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  
  const colors = [
    { hex: '#4f46e5', bg: 'bg-indigo-600' },
    { hex: '#10b981', bg: 'bg-emerald-500' },
    { hex: '#f97316', bg: 'bg-orange-500' },
    { hex: '#3b82f6', bg: 'bg-blue-500' },
    { hex: '#a855f7', bg: 'bg-purple-500' },
    { hex: '#f43f5e', bg: 'bg-rose-500' }
  ];

  let currentOffset = 0;
  
  return (
    <div className="flex justify-center items-center w-full mt-4 pb-4">
      <div className="relative w-56 h-56 flex-shrink-0">
        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90 drop-shadow-sm">
          <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f3f4f6" strokeWidth="5" />
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            if (percentage === 0) return null;
            const offset = currentOffset;
            currentOffset -= percentage;
            const color = colors[index % colors.length];
            return (
              <circle
                key={item.label}
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke={color.hex}
                strokeWidth={hoveredData?.label === item.label ? "6" : "5"}
                strokeDasharray={`${percentage} ${100 - percentage}`}
                strokeDashoffset={offset}
                className="transition-all duration-300 ease-in-out cursor-pointer"
                onMouseEnter={() => setHoveredData({ ...item, percentage: Math.round(percentage), color: color.hex })}
                onMouseLeave={() => setHoveredData(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none p-6 text-center">
          {hoveredData ? (
            <div className="animate-in fade-in zoom-in duration-200 flex flex-col items-center">
              <span className="text-3xl font-bold text-gray-800 leading-none mb-1" style={{ color: hoveredData.color }}>
                {hoveredData.percentage}%
              </span>
              <span className="text-[11px] text-gray-600 font-semibold uppercase tracking-wide px-2 leading-tight">
                {hoveredData.label}
              </span>
              <span className="text-sm font-bold text-gray-400 mt-1">
                {hoveredData.value} Items
              </span>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300 flex flex-col items-center">
              <span className="text-4xl font-bold text-gray-800">{total}</span>
              <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mt-1">{totalLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
