import { memo, useMemo, useId } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';

/**
 * Barra premium con gradiente, hover y drill-down.
 * @param {{ data: {label:string,value:number}[], colors?: [string,string], height?: number, onSelect?: (datum:any)=>void }} props
 */
const PremiumBarChart = memo(({ data = [], colors = ['#60a5fa', '#2563eb'], height = 240, onSelect }) => {
  const maxVal = useMemo(() => Math.max(...data.map((d) => Number(d.value) || 0), 1), [data]);
  const gradientId = useId().replace(/:/g, '');
  const resolvedColors = colors.length >= 2 ? colors : [colors[0], colors[0]];

  if (!data.length) {
    return (
      <Box sx={{ height, display: 'grid', placeItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Sin datos
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', px: 1, height }}>
      <svg width="0" height="0">
        <defs>
          <linearGradient id={`${gradientId}-bars`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={resolvedColors[0]} stopOpacity="0.95" />
            <stop offset="100%" stopColor={resolvedColors[1]} stopOpacity="0.75" />
          </linearGradient>
        </defs>
      </svg>
      <Stack direction="row" alignItems="flex-end" spacing={1.5} sx={{ height: '100%' }}>
        {data.map((d, idx) => {
          const value = Number(d.value) || 0;
          const h = (value / maxVal) * (height - 48);
          return (
            <Tooltip
              key={`${d.label}-${idx}`}
              title={
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2">{d.label}</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {value.toLocaleString()}
                  </Typography>
                </Stack>
              }
              placement="top"
              arrow
            >
              <Box
                component="button"
                type="button"
                onClick={() => onSelect && onSelect(d)}
                sx={(theme) => ({
                  appearance: 'none',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  flex: 1,
                  minWidth: 28,
                  outline: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover .bar': {
                    transform: 'translateY(-6px)',
                    boxShadow: theme.shadows[4]
                  }
                })}
              >
                <Box
                  className="bar"
                  sx={{
                    width: '100%',
                    height: h || 6,
                    borderRadius: 1.25,
                    transition: 'all 180ms ease',
                    background: `linear-gradient(180deg, ${resolvedColors[0]}, ${resolvedColors[1]})`,
                    opacity: 0.95
                  }}
                />
                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 80 }}>
                  {d.label}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
});

export default PremiumBarChart;
