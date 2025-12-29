import {
  Badge,
  Chip,
  ListItemButton,
  Stack,
  Typography,
  Box
} from '@mui/material';
import { alpha } from '@mui/material/styles';

const STATUS_COLOR = {
  UNASSIGNED: 'warning',
  ASSIGNED: 'primary',
  OPEN: 'primary',
  CLOSED: 'default',
  BLOCKED: 'error'
};

const ChatItem = ({ chat, selected, onSelect, unread = 0 }) => {
  const queueLabel = chat.queueName || chat.queue || 'Sin cola';
  const agentLabel = chat.assignedUserName || 'Sin asignar';
  const connectionStatus = (chat.whatsappStatus || chat.whatsapp_status || '').toUpperCase();
  const statusColor =
    connectionStatus === 'CONNECTED'
      ? 'success'
      : connectionStatus === 'DISCONNECTED'
        ? 'default'
        : 'warning';
  const connectionLabel = chat.whatsappSessionName || chat.whatsapp_session_name || 'Sin conexión';

  return (
    <ListItemButton
      selected={selected}
      onClick={() => onSelect?.(chat)}
      sx={(theme) => ({
        px: 1.5,
        py: 1,
        mb: 0.5,
        borderRadius: 1.5,
        alignItems: 'center',
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.semanticColors.surface,
        transition: 'background-color 120ms ease, border-color 120ms ease',

        '&.Mui-selected': {
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          borderColor: theme.palette.primary.main
        }
      })}
    >
      {/* Contenido */}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {/* Línea 1 */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="body2"
            fontWeight={600}
            noWrap
            sx={{ flex: 1 }}
          >
            {chat.remoteNumber || 'Sin número'}
          </Typography>

          {/* Unread */}
          {unread > 0 && (
            <Badge
              color="primary"
              badgeContent={unread}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: 11,
                  height: 16,
                  minWidth: 16
                }
              }}
            />
          )}

          {/* Conexión (antes status) */}
          <Chip
            size="small"
            label={connectionLabel}
            color={statusColor}
            sx={{ height: 18, fontSize: 11 }}
          />
        </Stack>

        {/* Línea 2 */}
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
        >
          {queueLabel} · {agentLabel}
        </Typography>

        {/* Segmento opcional */}
        {chat.metadata?.segment && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ opacity: 0.7 }}
            noWrap
          >
            {chat.metadata.segment}
          </Typography>
        )}
      </Box>
    </ListItemButton>
  );
};

export default ChatItem;
