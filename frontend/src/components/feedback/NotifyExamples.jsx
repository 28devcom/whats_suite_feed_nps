import { useState } from 'react';
import { Button, Stack, Divider, Typography, Box } from '@mui/material';
import { useNotify } from '../../context/NotifyContext.jsx';

const NotifyExamples = () => {
  const { notify, confirm } = useNotify();
  const [loading, setLoading] = useState(false);

  const simulateAsync = async (cb, delay = 1200) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, delay));
    setLoading(false);
    cb?.();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Notificaciones – Ejemplos
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ejemplos de uso del sistema centralizado de notificaciones y confirmaciones.
      </Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap">
        {/* ===================== SUCCESS ===================== */}
        <Button
          variant="contained"
          color="success"
          disabled={loading}
          onClick={() =>
            simulateAsync(() =>
              notify({
                message: 'La operación se completó correctamente',
                severity: 'success'
              })
            )
          }
        >
          Éxito
        </Button>

        {/* ===================== ERROR ===================== */}
        <Button
          variant="contained"
          color="error"
          disabled={loading}
          onClick={() =>
            simulateAsync(() =>
              notify({
                message: 'Ocurrió un error inesperado. Intenta nuevamente.',
                severity: 'error'
              })
            )
          }
        >
          Error
        </Button>

        {/* ===================== WARNING ===================== */}
        <Button
          variant="outlined"
          color="warning"
          disabled={loading}
          onClick={() =>
            notify({
              message: 'Algunos campos están incompletos',
              severity: 'warning'
            })
          }
        >
          Advertencia
        </Button>

        {/* ===================== INFO ===================== */}
        <Button
          variant="outlined"
          disabled={loading}
          onClick={() =>
            notify({
              message: 'Cambios guardados automáticamente',
              severity: 'info'
            })
          }
        >
          Información
        </Button>
      </Stack>

      <Divider sx={{ my: 3 }} />

      {/* ===================== CONFIRM ===================== */}
      <Stack spacing={2}>
        <Typography variant="subtitle1">
          Confirmación crítica
        </Typography>

        <Button
          variant="contained"
          color="warning"
          disabled={loading}
          onClick={() =>
            confirm({
              title: '¿Confirmar acción?',
              message:
                'Esta operación no se puede deshacer. Se registrará en auditoría.',
              confirmText: 'Sí, continuar',
              cancelText: 'Cancelar',
              onConfirm: () =>
                notify({
                  message: 'Acción confirmada correctamente',
                  severity: 'success'
                })
            })
          }
        >
          Eliminar recurso
        </Button>
      </Stack>
    </Box>
  );
};

export default NotifyExamples;
