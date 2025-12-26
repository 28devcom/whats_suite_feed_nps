import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const NotFound = () => {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', color: 'text.primary', p: 3 }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h3" fontWeight={800}>
          404
        </Typography>
        <Typography variant="body1" color="text.secondary">
          La ruta solicitada no existe.
        </Typography>
        <Button component={RouterLink} to="/status" variant="contained">
          Ir al estado del sistema
        </Button>
        <Button component={RouterLink} to="/" variant="text">
          Volver al inicio de sesión
        </Button>
      </Stack>
    </Box>
  );
};

export default NotFound;
