import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemText
} from '@mui/material';

const statusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'sent':
    case 'completed':
      return 'success';
    case 'error':
      return 'error';
    case 'pending':
    case 'sending':
      return 'warning';
    default:
      return 'default';
  }
};

const formatSeconds = (seconds) => {
  const secs = Number(seconds || 0);
  if (!Number.isFinite(secs)) return '0';
  return secs % 1 === 0 ? secs.toString() : secs.toFixed(2).replace(/\.?0+$/, '');
};

const BroadcastCampaignDetail = ({ open, onClose, detail }) => {
  if (!detail) return null;
  const { campaign, messages, stats } = detail;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Campaña: {campaign.name}</Typography>
          <Chip label={campaign.status} color={statusColor(campaign.status)} />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.2}>
          <Typography variant="body2" color="text.secondary">
            Tipo: {campaign.message_type} • Conexiones: {(campaign.connections || []).join(', ') || 'N/D'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ventana: {campaign.start_at || 'inmediato'} → {campaign.stop_at || 'sin fin'}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={`Total ${stats.total || 0}`} />
            <Chip size="small" color="success" label={`Enviados ${stats.sent || 0}`} />
            <Chip size="small" color="warning" label={`Pendientes ${stats.pending || 0}`} />
            <Chip size="small" color="error" label={`Errores ${stats.error || 0}`} />
          </Stack>
          <Divider />
          <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
            <List dense>
              {messages.map((m) => (
                <ListItem key={m.id} divider>
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip size="small" color={statusColor(m.status)} label={m.status} />
                        <Typography variant="body2">{m.target}</Typography>
                      </Stack>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        Intentos: {m.attempts} • Sesión: {m.session_name || 'N/D'} • Delay:{' '}
                        {formatSeconds(m.delay_seconds ?? m.delay_ms)}s
                        {m.error_reason ? ` • Error: ${m.error_reason}` : ''}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default BroadcastCampaignDetail;
