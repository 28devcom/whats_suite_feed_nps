import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import { normalizePhoneNumber } from '../../utils/phone.js';

const avatarFromChat = (chat) =>
  chat?.contactAvatar ||
  chat?.remoteAvatar ||
  chat?.remote_avatar ||
  chat?.remoteProfilePic ||
  chat?.remote_profile_pic ||
  chat?.profilePic ||
  chat?.profile_pic ||
  chat?.profilePicUrl ||
  chat?.profile_pic_url ||
  chat?.avatar ||
  null;

const ContactInfoModal = ({ open, onClose, contact, chat, onSave, loading = false, error = null, avatarUrl = null }) => {
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState('');
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);

  const phoneNormalized = useMemo(
    () => normalizePhoneNumber(contact?.phoneNormalized || chat?.remoteNumber || chat?.remote_number || ''),
    [contact?.phoneNormalized, chat?.remoteNumber, chat?.remote_number]
  );

  const resolvedAvatar = avatarUrl || contact?.avatarRef || avatarFromChat(chat);

  useEffect(() => {
    setDisplayName(contact?.displayName || '');
    setLocalError('');
  }, [contact, open]);

  const metadataEntries = useMemo(() => {
    const items = [];
    if (chat?.whatsappSessionName || chat?.whatsapp_session_name) {
      items.push({
        label: 'Conexión',
        value: chat.whatsappSessionName || chat.whatsapp_session_name
      });
    }
    if (chat?.queueName) {
      items.push({ label: 'Cola', value: chat.queueName });
    }
    if (chat?.pushName || chat?.contactName) {
      items.push({ label: 'Nombre remoto', value: chat.pushName || chat.contactName });
    }
    if (contact?.metadata && Object.keys(contact.metadata).length) {
      items.push({ label: 'Metadata', value: JSON.stringify(contact.metadata) });
    }
    return items;
  }, [chat?.whatsappSessionName, chat?.whatsapp_session_name, chat?.queueName, chat?.pushName, chat?.contactName, contact?.metadata]);

  const handleSave = () => {
    if (displayName.trim().length > 120) {
      setLocalError('Máximo 120 caracteres');
      return;
    }
    setLocalError('');
    onSave?.({ displayName });
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={loading ? undefined : onClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Contacto</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack spacing={1} alignItems="center">
              <Box
                sx={(theme) => ({
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `2px solid ${theme.palette.divider}`,
                  cursor: resolvedAvatar ? 'pointer' : 'default',
                  display: 'grid',
                  placeItems: 'center'
                })}
                onClick={() => resolvedAvatar && setShowAvatarPreview(true)}
              >
                <Avatar
                  src={resolvedAvatar || undefined}
                  alt={displayName || phoneNormalized || 'Contacto'}
                  sx={(theme) => ({
                    width: '100%',
                    height: '100%',
                    bgcolor: resolvedAvatar ? theme.palette.background.paper : theme.palette.primary.light,
                    color: resolvedAvatar ? theme.palette.text.primary : theme.palette.primary.contrastText,
                    fontSize: 32,
                    fontWeight: 700
                  })}
                >
                  {(displayName || phoneNormalized || 'C')[0]?.toUpperCase()}
                </Avatar>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {resolvedAvatar ? 'Click para ver en grande' : 'Sin avatar disponible'}
              </Typography>
            </Stack>

            {localError && <Alert severity="warning">{localError}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Nombre del contacto"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              size="small"
              inputProps={{ maxLength: 120 }}
              helperText="Se muestra en todas las conexiones. Deja vacío para usar el número."
              disabled={loading}
            />

            <TextField
              label="Número (normalizado)"
              value={phoneNormalized}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
            />

            {metadataEntries.length > 0 && (
              <Stack spacing={0.5}>
                {metadataEntries.map((item) => (
                  <Stack key={item.label} direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
                      {item.label}:
                    </Typography>
                    <Typography variant="body2" noWrap title={item.value}>
                      {item.value}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showAvatarPreview && !!resolvedAvatar} onClose={() => setShowAvatarPreview(false)} maxWidth="xs">
        <DialogContent sx={{ p: 0 }}>
          {resolvedAvatar && (
            <Box
              component="img"
              src={resolvedAvatar}
              alt="avatar ampliado"
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactInfoModal;
