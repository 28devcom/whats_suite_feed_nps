import { Box, Typography } from '@mui/material';
import usePermissions from '../hooks/usePermissions.js';

const PermissionGate = ({ roles, fallback, children }) => {
  const { hasRole } = usePermissions();

  if (!hasRole(roles)) {
    return fallback || (
      <Box sx={{ p: 3, border: (theme) => `1px dashed ${theme.palette.divider}`, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Typography variant="body2" color="text.secondary">
          No tienes permisos para ver este módulo.
        </Typography>
      </Box>
    );
  }

  return children;
};

export default PermissionGate;
