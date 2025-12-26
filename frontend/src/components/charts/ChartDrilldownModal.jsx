import { memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Divider,
  Chip
} from '@mui/material';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';

/**
 * Modal de drill-down para gráficas.
 * @param {{ open: boolean, datum: { label: string, value: number, source?: string } | null, onClose: ()=>void }} props
 */
const ChartDrilldownModal = memo(({ open, datum, onClose }) => {
  const label = datum?.label || 'Sin selección';
  const value = Number(datum?.value || 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Detalle de <strong>{label}</strong>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={datum?.source || 'Total'} color="primary" variant="outlined" icon={<InsightsRoundedIcon />} />
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1 }}>
              {value.toLocaleString()}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              mensajes
            </Typography>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Selecciona un punto en la gráfica para ver su detalle. Integra aquí el desglose específico desde backend según la selección.
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
});

export default ChartDrilldownModal;
