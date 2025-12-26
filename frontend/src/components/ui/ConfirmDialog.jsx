import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Stack,
  Typography,
  Chip,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';

const severityConfig = {
  danger: {
    color: 'error',
    icon: WarningAmberIcon,
    requireAck: true
  },
  warning: {
    color: 'warning',
    icon: ReportProblemOutlinedIcon,
    requireAck: false
  },
  info: {
    color: 'info',
    icon: InfoOutlinedIcon,
    requireAck: false
  }
};

const ConfirmDialog = ({
  open,
  title = 'Confirmar acción',
  description,
  onClose,
  onConfirm,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  severity = 'danger',
  roleHint,
  loading = false,
  disableBackdropClose = true,
  acknowledgeText = 'Entiendo que esta acción es irreversible'
}) => {
  const cfg = severityConfig[severity] || severityConfig.danger;
  const Icon = cfg.icon;

  const confirmBtnRef = useRef(null);
  const [ack, setAck] = useState(!cfg.requireAck);

  /* ===================== FOCUS & RESET ===================== */
  useEffect(() => {
    if (open) {
      setAck(!cfg.requireAck);
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [open, cfg.requireAck]);

  const handleClose = (_, reason) => {
    if (loading) return;
    if (disableBackdropClose && reason === 'backdropClick') return;
    onClose?.();
  };

  const canConfirm = !loading && ack;

  /* ===================== RENDER ===================== */
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">
        <Stack direction="row" spacing={1} alignItems="center">
          <Icon color={cfg.color} />
          <Typography variant="h6">{title}</Typography>

          {roleHint && (
            <Chip
              size="small"
              label={`Rol requerido: ${roleHint}`}
              variant="outlined"
              sx={{ ml: 'auto' }}
            />
          )}
        </Stack>
      </DialogTitle>

      <DialogContent>
        <DialogContentText
          id="confirm-dialog-description"
          sx={{ color: 'text.primary' }}
        >
          {description}
        </DialogContentText>

        {cfg.requireAck && (
          <FormControlLabel
            sx={{ mt: 2 }}
            control={
              <Checkbox
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                color={cfg.color}
              />
            }
            label={acknowledgeText}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>

        <Button
          ref={confirmBtnRef}
          onClick={onConfirm}
          color={cfg.color}
          variant="contained"
          disabled={!canConfirm}
        >
          {loading ? 'Procesando…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
