import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from '@mui/material';
import QRCode from 'qrcode';

const WhatsAppQRCodeModal = ({
  open,
  sessionId,
  status,            // 'pending' | 'connected' | 'error'
  qr,
  qrBase64,
  hasStoredKeys = false,
  loading = false,
  error,
  onClose,
  onRenewQr,
  autoCloseOnConnect = true
}) => {
  const [dataUrl, setDataUrl] = useState(null);
  const [renderError, setRenderError] = useState(null);

  /* ===================== AUTO CLOSE ===================== */
  useEffect(() => {
    if (open && autoCloseOnConnect && status === 'connected') {
      onClose?.();
    }
  }, [open, status, autoCloseOnConnect, onClose]);

  /* ===================== GENERATE QR ===================== */
  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      if (status !== 'pending') {
        setDataUrl(null);
        return;
      }

      setRenderError(null);
      setDataUrl(null);

      try {
        if (qrBase64) {
          if (!cancelled) {
            setDataUrl(`data:image/png;base64,${qrBase64}`);
          }
          return;
        }

        if (qr) {
          const url = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 280
          });
          if (!cancelled) setDataUrl(url);
        }
      } catch (e) {
        if (!cancelled) setRenderError(e);
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
  }, [status, qr, qrBase64]);

  /* ===================== DERIVED ===================== */
  const showLoading = loading || (status === 'pending' && !dataUrl && !renderError && !error);
  const showEmpty = status !== 'pending' || (!qr && !qrBase64);
  const canRenew = status === 'pending' && hasStoredKeys;

  /* ===================== BODY ===================== */
  const body = useMemo(() => {
    if (showLoading) {
      return (
        <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
          <CircularProgress />
          <Typography variant="body2">
            Generando código QR…
          </Typography>
        </Stack>
      );
    }

    if (error) {
      return (
        <Alert severity="error">
          {error.message || 'Error al obtener el código QR.'}
        </Alert>
      );
    }

    if (renderError) {
      return (
        <Alert severity="error">
          No se pudo renderizar el QR. Intenta reiniciar la conexión.
        </Alert>
      );
    }

    if (showEmpty) {
      return (
        <Alert severity="info">
          No hay un QR disponible en este momento.
        </Alert>
      );
    }

    if (!dataUrl) {
      return (
        <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
          <CircularProgress />
          <Typography variant="body2">
            Renderizando QR…
          </Typography>
        </Stack>
      );
    }

    return (
      <Stack spacing={2} alignItems="center">
        <Typography variant="body1" align="center">
          Escanea el código QR desde WhatsApp para vincular la sesión.
        </Typography>

        <Box
          component="img"
          src={dataUrl}
          alt="Código QR de WhatsApp"
          sx={(theme) => ({
            width: 260,
            height: 260,
            objectFit: 'contain',
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[3]
          })}
        />

        <Typography variant="caption" color="text.secondary" align="center">
          El código expira automáticamente si no se escanea.
        </Typography>
      </Stack>
    );
  }, [showLoading, error, renderError, showEmpty, dataUrl]);

  /* ===================== RENDER ===================== */
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="whatsapp-qr-title"
      aria-describedby="whatsapp-qr-description"
    >
      <DialogTitle id="whatsapp-qr-title">
        Escanea el QR{sessionId ? ` (${sessionId})` : ''}
      </DialogTitle>

      <DialogContent dividers id="whatsapp-qr-description">
        {body}
      </DialogContent>

      <DialogActions>
        {canRenew && (
          <Button
            onClick={() => onRenewQr?.(sessionId)}
            variant="outlined"
            disabled={loading}
          >
            Nuevo QR
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhatsAppQRCodeModal;
