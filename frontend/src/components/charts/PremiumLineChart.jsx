import { memo, useMemo, useId } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';

/**
 * Línea premium con puntos interactivos y drill-down.
 * @param {{ data: {label:string,value:number}[], color?: string, height?: number, onSelect?: (datum:any)=>void }} props
 */
const PremiumLineChart = memo(({ data = [], color = '#22d3ee', height = 240, onSelect }) => {
  const maxVal = useMemo(() => Math.max(...data.map((d) => Number(d.value) || 0, 1), 1), [data]);
  const width = Math.max(data.length * 72, 360);
  const paddingX = 20;
  const paddingY = 16;
  const innerHeight = height - paddingY * 2;
  const stepX = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0;
  const gradientId = useId().replace(/:/g, '');

  if (!data.length) {
    return (
      <Box sx={{ height, display: 'grid', placeItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Sin datos
        </Typography>
      </Box>
    );
  }

  const points = data.map((d, idx) => {
    const value = Number(d.value) || 0;
    const x = paddingX + idx * stepX;
    const y = paddingY + innerHeight - (value / maxVal) * innerHeight;
    return { x, y, ...d, value };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath =
    points.length > 1
      ? `M ${points[0].x},${height - paddingY} L ${polylinePoints} L ${points[points.length - 1].x},${
          height - paddingY
        } Z`
      : '';

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg width={width} height={height} role="img">
        <defs>
          <linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath && (
          <path d={areaPath} fill={`url(#${gradientId}-line)`} stroke="none" opacity={0.5} />
        )}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, idx) => (
          <Tooltip
            key={`${p.label}-${idx}`}
            title={
              <Box>
                <Typography variant="subtitle2">{p.label}</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {p.value.toLocaleString()}
                </Typography>
              </Box>
            }
            placement="top"
            arrow
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={6}
              fill="#fff"
              stroke={color}
              strokeWidth={2}
              style={{ cursor: 'pointer', transition: 'all 160ms ease' }}
              onMouseOver={(e) => {
                e.currentTarget.setAttribute('r', '7.5');
              }}
              onMouseOut={(e) => {
                e.currentTarget.setAttribute('r', '6');
              }}
              onClick={() => onSelect && onSelect({ label: p.label, value: p.value, index: idx })}
            />
          </Tooltip>
        ))}
      </svg>
    </Box>
  );
});

export default PremiumLineChart;
