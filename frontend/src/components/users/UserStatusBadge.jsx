import { Chip } from '@mui/material';

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Activo',
    color: 'success'
  },
  PENDING: {
    label: 'Pendiente',
    color: 'warning'
  },
  ERROR: {
    label: 'Error',
    color: 'error'
  },
  INACTIVE: {
    label: 'Inactivo',
    color: 'default'
  },
  BLOCKED: {
    label: 'Bloqueado',
    color: 'error'
  }
};

const normalizeStatus = (status) =>
  typeof status === 'string' ? status.trim().toUpperCase() : '';

const UserStatusBadge = ({
  status,
  variant = 'filled',
  size = 'small'
}) => {
  const key = normalizeStatus(status);
  const cfg = STATUS_CONFIG[key];

  return (
    <Chip
      size={size}
      variant={variant}
      color={cfg?.color || 'default'}
      label={cfg?.label || key || '—'}
      aria-label={`Estado del usuario: ${cfg?.label || 'Desconocido'}`}
      sx={{
        fontWeight: 600,
        letterSpacing: 0.2
      }}
    />
  );
};

export default UserStatusBadge;
