import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmptyState from './ui/EmptyState.jsx';
import SkeletonList from './ui/SkeletonList.jsx';

const statusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return 'success';
    case 'running':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

const formatSeconds = (ms) => {
  const secs = Number(ms || 0) / 1000;
  if (!Number.isFinite(secs)) return '0';
  return secs % 1 === 0 ? secs.toString() : secs.toFixed(2).replace(/\.?0+$/, '');
};

const BroadcastHistory = ({ items = [], loading = false, onRefresh, onSelect }) => {
  if (loading) return <SkeletonList rows={3} withAvatar={false} />;
  if (!items.length) {
    return (
      <EmptyState
        title="Sin campañas"
        description="Cuando envíes una campaña verás aquí el avance, los envíos exitosos y los errores."
      />
    );
  }
  return (
    <Stack spacing={2} sx={{ maxHeight: 480, overflowY: 'auto', pr: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">Historial de campañas</Typography>
        {onRefresh && (
          <Tooltip title="Refrescar">
            <IconButton size="small" onClick={onRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {items.map((c) => (
        <Card
          key={c.id}
          variant="outlined"
          sx={{ cursor: onSelect ? 'pointer' : 'default', flex: '0 0 auto' }}
          onClick={() => onSelect && onSelect(c)}
        >
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {c.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(c.created_at || c.createdAt).toLocaleString()} • {c.message_type?.toUpperCase()}
                </Typography>
              </Stack>
              <Chip label={c.status} color={statusColor(c.status)} />
            </Stack>
            <Box sx={{ mt: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, c.progress || 0)}
                sx={{ borderRadius: 2, height: 8 }}
              />
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.75 }}>
                <Typography variant="caption" color="text.secondary">
                  {c.sent_count || 0}/{c.total_targets || 0} enviados
                </Typography>
                <Typography variant="caption" color="error.main">
                  {c.error_count || 0} errores
                </Typography>
              </Stack>
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip size="small" label={`Delay ${formatSeconds(c.delay_min_ms)}-${formatSeconds(c.delay_max_ms)}s`} />
              <Chip size="small" label={`${(c.connections || []).length} conexiones`} />
            </Stack>
            {c.last_error && (
              <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                {c.last_error}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

export default BroadcastHistory;
