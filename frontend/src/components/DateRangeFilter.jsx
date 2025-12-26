import { Stack, TextField, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

const DateRangeFilter = ({ from, to, onChange, onSubmit, loading }) => (
  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
    <TextField
      type="date"
      label="Desde"
      size="small"
      value={from}
      onChange={(e) => onChange({ fecha_inicio: e.target.value, fecha_fin: to })}
      InputLabelProps={{ shrink: true }}
    />
    <TextField
      type="date"
      label="Hasta"
      size="small"
      value={to}
      onChange={(e) => onChange({ fecha_inicio: from, fecha_fin: e.target.value })}
      InputLabelProps={{ shrink: true }}
    />
    <Button
      variant="contained"
      startIcon={<RefreshIcon />}
      onClick={onSubmit}
      disabled={loading || !from || !to}
    >
      Actualizar
    </Button>
  </Stack>
);

export default DateRangeFilter;
