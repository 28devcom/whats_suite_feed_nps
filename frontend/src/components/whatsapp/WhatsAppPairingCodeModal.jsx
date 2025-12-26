import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const WhatsAppPairingCodeModal = ({
  open,
  sessionId,
  pairingCode,
  onClose,
  expiresIn // opcional: segundos restantes
}) => {
  const codeRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setCopied(false);
      setTimeout(() => codeRef.current?.focus(), 50);
    }
  }, [open]);

  const handleCopy = async () => {
    if (!pairingCode?.code) return;
    try {
      await navigator.clipboard.writeText(pairingCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop: el Alert de abajo cubre el caso
    }
  };

  const hasCode = Boolean(pairingCode?.code);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="pairing-code-title"
      aria-describedby="pairing-code-description"
    >
      <DialogTitle id="pairing-code-title">
        Código de emparejamiento{sessionId ? ` (${sessionId})` : ''}
      </DialogTitle>

      <DialogContent dividers>
        {hasCode ? (
          <Stack spacing={2} alignItems="center">
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: (theme) => `1px dashed ${theme.palette.divider}`
              }}
            >
              <Typography
                ref={codeRef}
                tabIndex={0}
                variant="h4"
                component="div"
                fontWeight={800}
                letterSpacing={2}
                aria-label={`Código de emparejamiento ${pairingCode.code}`}
              >
                {pairingCode.code}
              </Typography>

              <Tooltip title={copied ? 'Copiado' : 'Copiar'} arrow>
                <span>
                  <IconButton onClick={handleCopy} size="small">
                    {copied ? (
                      <CheckCircleOutlineIcon color="success" />
                    ) : (
                      <ContentCopyIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>

            <Typography
              id="pairing-code-description"
              variant="body2"
              color="text.secondary"
              align="center"
            >
              Ingresa este código en WhatsApp para vincular el dispositivo
              <strong> sin escanear QR</strong>.
            </Typography>

            {typeof expiresIn === 'number' && (
              <Alert severity="info" sx={{ width: '100%' }}>
                El código expira en {expiresIn} segundos.
              </Alert>
            )}
          </Stack>
        ) : (
          <Alert severity="warning">
            No hay un código de emparejamiento disponible en este momento.
            Intenta generar uno nuevo.
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhatsAppPairingCodeModal;
