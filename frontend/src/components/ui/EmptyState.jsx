import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import InboxIcon from '@mui/icons-material/Inbox';

const EmptyState = ({
  title = 'Sin datos',
  description = 'No hay información para mostrar.',
  icon: Icon = InboxIcon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  size = 'md'
}) => {
  const sizes = {
    sm: { icon: 56, title: 'subtitle1', desc: 'body2' },
    md: { icon: 72, title: 'h6', desc: 'body2' },
    lg: { icon: 96, title: 'h5', desc: 'body1' }
  };

  const cfg = sizes[size] || sizes.md;

  return (
    <Stack
      role="status"
      aria-live="polite"
      spacing={2}
      alignItems="center"
      justifyContent="center"
      sx={{
        py: { xs: 4, sm: 6 },
        px: 2,
        textAlign: 'center',
        color: 'text.secondary'
      }}
    >
      {/* ===================== ICON ===================== */}
      <Box
        aria-hidden
        sx={(theme) => ({
          width: cfg.icon,
          height: cfg.icon,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          display: 'grid',
          placeItems: 'center'
        })}
      >
        <Icon color="primary" fontSize="large" />
      </Box>

      {/* ===================== TEXT ===================== */}
      <Stack spacing={0.5}>
        <Typography variant={cfg.title} color="text.primary">
          {title}
        </Typography>
        <Typography variant={cfg.desc} color="text.secondary">
          {description}
        </Typography>
      </Stack>

      {/* ===================== ACTIONS ===================== */}
      {(actionLabel || secondaryActionLabel) && (
        <Stack direction="row" spacing={1}>
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outlined"
              size="small"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          )}

          {actionLabel && onAction && (
            <Button
              variant="contained"
              size="small"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default EmptyState;
