import { Card, CardContent, Stack, Typography, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

const StatusCard = ({ title, healthy, subtitle }) => {
  const icon = healthy === null ? <HourglassEmptyIcon color="warning" /> : healthy ? <CheckCircleIcon color="success" /> : <ErrorOutlineIcon color="error" />;
  const label = healthy === null ? 'Pendiente' : healthy ? 'OK' : 'Atención';
  const color = healthy === null ? 'warning' : healthy ? 'success' : 'error';

  return (
    <Card sx={{ bgcolor: 'background.paper', borderColor: 'primary.dark', borderWidth: 1, borderStyle: 'solid' }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          {icon}
          <Stack spacing={1} sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="body1" color="text.primary">
              {subtitle}
            </Typography>
          </Stack>
          <Chip label={label} color={color} variant="outlined" size="small" />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default StatusCard;
