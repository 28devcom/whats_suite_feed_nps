import { Box, Typography } from '@mui/material';
import PageLayout from './PageLayout.jsx';

// Mensaje consistente para accesos no permitidos en rutas protegidas.
const AccessDenied = ({ title = 'Acceso restringido', description = 'No tienes permisos para ver este módulo.' }) => (
  <PageLayout title={title} subtitle={description} maxWidth="md">
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        border: (theme) => `1px dashed ${theme.palette.divider}`,
        bgcolor: 'background.paper'
      }}
    >
      <Typography variant="body1" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  </PageLayout>
);

export default AccessDenied;
