import React, { useState } from 'react';

// Pure React SVG Line Chart with Gradient Fill
export function LineChart({ data = [20, 45, 28, 80, 59, 95, 68], labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], height = 200 }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = 500;
  const chartHeight = height;

  const maxVal = Math.max(...data, 10) * 1.1;
  const minVal = 0;
  const valRange = maxVal - minVal;

  const points = data.map((val, index) => {
    const x = paddingX + (index / (data.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((val - minVal) / valRange) * (chartHeight - paddingY * 2);
    return { x, y, value: val, label: labels[index] };
  });

  // Generate SVG path for line
  const pathD = points.reduce((acc, point, index) => {
    return index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, '');

  // Generate SVG path for filled area
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = paddingY + ratio * (chartHeight - paddingY * 2);
          const value = Math.round(maxVal - ratio * valRange);
          return (
            <g key={index} opacity="0.15">
              <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#4b5a50" strokeWidth="1" strokeDasharray="4 4" />
              <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#17211b" fontWeight="700">{value} kg</text>
            </g>
          );
        })}

        {/* X Axis Labels */}
        {points.map((point, index) => (
          <text key={index} x={point.x} y={chartHeight - 10} textAnchor="middle" fontSize="11" fill="#4b5a50" fontWeight="600">
            {point.label}
          </text>
        ))}

        {/* Filled Area */}
        <path d={areaD} fill="url(#chartGrad)" />

        {/* Line Path */}
        <path d={pathD} fill="none" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={hoveredPoint?.index === index ? 6.5 : 4.5}
            fill={hoveredPoint?.index === index ? '#22C55E' : '#ffffff'}
            stroke="#22C55E"
            strokeWidth="3"
            style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
            onMouseEnter={() => setHoveredPoint({ ...point, index })}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}
      </svg>

      {/* Dynamic Tooltip */}
      {hoveredPoint && (
        <div
          className="card"
          style={{
            position: 'absolute',
            left: `${(hoveredPoint.x / chartWidth) * 100}%`,
            top: `${(hoveredPoint.y / chartHeight) * 100 - 45}%`,
            transform: 'translateX(-50%)',
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: '800',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            border: '1px solid #dfe6dc',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 5
          }}
        >
          <span style={{ color: '#22C55E' }}>{hoveredPoint.value} kg</span> ({hoveredPoint.label})
        </div>
      )}
    </div>
  );
}

// Pure React SVG Doughnut Chart
export function DoughnutChart({ data = [45, 20, 15, 10, 10], labels = ['Cooked', 'Fruits', 'Bakery', 'Veg', 'Others'], colors = ['#22C55E', '#F97316', '#3B82F6', '#E2E8F0', '#EF4444'] }) {
  const total = data.reduce((acc, val) => acc + val, 0);
  let accumulatedPercent = 0;

  const radius = 65;
  const strokeWidth = 22;
  const center = 85;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative', width: '170px', height: '170px' }}>
        <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: 'rotate(-90deg)' }}>
          {data.map((value, index) => {
            const percentage = total > 0 ? value / total : 0;
            const strokeDasharray = `${percentage * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += percentage;

            return (
              <circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={colors[index] || '#e2e8f0'}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap={percentage > 0.03 ? 'round' : 'butt'}
                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#17211b' }}>
            {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
          </span>
          <p style={{ fontSize: '11px', color: '#4b5a50', margin: 0, fontWeight: '700' }}>Units</p>
        </div>
      </div>

      {/* Legend list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px', width: '100%' }}>
        {labels.map((label, index) => {
          const value = data[index] || 0;
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', color: '#4b5a50' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colors[index], display: 'inline-block' }}></span>
              <span>{label} ({percentage}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
