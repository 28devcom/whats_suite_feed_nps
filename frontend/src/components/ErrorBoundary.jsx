import React from 'react';
import { Box, Button, Typography, Stack, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Aquí se puede enviar a un servicio externo (Sentry, etc.)
    console.error('Unhandled UI error', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
          <Paper sx={{ p: 4, maxWidth: 480, textAlign: 'center', bgcolor: 'background.paper', border: (theme) => `1px solid ${theme.palette.divider}` }}>
            <Stack spacing={2} alignItems="center">
              <Typography variant="h5" fontWeight={800}>
                Algo salió mal
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Se produjo un error inesperado. Refresca para continuar. {this.state.error?.message}
              </Typography>
              <Button variant="contained" startIcon={<RefreshIcon />} onClick={this.handleReload}>
                Recargar
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
