import { Chip, CircularProgress, Stack, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SyncIcon from '@mui/icons-material/Sync';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const STATUS_CONFIG = {
  connected: {
    label: 'Conectado',
    color: 'success',
    icon: <CheckCircleIcon fontSize="small" />
  },
  pending: {
    label: 'Pendiente',
    color: 'info',
    icon: <HourglassEmptyIcon fontSize="small" />
  },
  connecting: {
    label: 'Conectando',
    color: 'warning',
    icon: <SyncIcon fontSize="small" />
  },
  restarting: {
    label: 'Reiniciando',
    color: 'warning',
    icon: <SyncIcon fontSize="small" />
  },
  disconnected: {
    label: 'Desconectado',
    color: 'default',
    icon: <HelpOutlineIcon fontSize="small" />
  },
  invalid: {
    label: 'Inválido',
    color: 'error',
    icon: <ErrorIcon fontSize="small" />
  },
  error: {
    label: 'Error',
    color: 'error',
    icon: <ErrorIcon fontSize="small" />
  }
};

const normalizeStatus = (status) =>
  typeof status === 'string' ? status.toLowerCase().trim() : 'unknown';

const WhatsAppStatusBadge = ({
  status,
  loading = false,
  size = 'small',
  showSpinner = true
}) => {
  const key = normalizeStatus(status);
  const cfg = STATUS_CONFIG[key];

  const label = cfg?.label || 'Desconocido';
  const color = cfg?.color || 'default';
  const icon = cfg?.icon;

  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      aria-label={`Estado de sesión WhatsApp: ${label}`}
    >
      <Tooltip title={label} arrow>
        <Chip
          size={size}
          color={color}
          icon={icon}
          label={label}
          sx={{ fontWeight: 600 }}
        />
      </Tooltip>

      {loading && showSpinner && (
        <CircularProgress
          size={14}
          thickness={5}
          aria-label="Estado cargando"
        />
      )}
    </Stack>
  );
};

export default WhatsAppStatusBadge;
