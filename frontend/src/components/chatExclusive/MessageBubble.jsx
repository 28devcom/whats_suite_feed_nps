import { useEffect, useState } from 'react';
import { Box, Button, Chip, Stack, Tooltip, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import { alpha } from '@mui/material/styles';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import MovieIcon from '@mui/icons-material/Movie';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const statusLabel = (status) => {
  switch (status) {
    case 'sent':
    case 'server':
      return 'Enviado';
    case 'delivered':
      return 'Entregado';
    case 'read':
    case 'played':
      return 'Leído';
    case 'failed':
      return 'No enviado';
    case 'deleted':
      return 'Eliminado';
    case 'pending':
    default:
      return 'Enviando';
  }
};

const renderStatusIcon = (status) => {
  switch (status) {
    case 'sent':
    case 'server':
      return <CheckIcon fontSize="inherit" color="success" />;
    case 'delivered':
      return <DoneAllIcon fontSize="inherit" sx={{ color: 'success.main' }} />;
    case 'read':
    case 'played':
      return <DoneAllIcon fontSize="inherit" sx={{ color: 'info.main' }} />;
    case 'failed':
      return <CloseIcon fontSize="inherit" color="error" />;
    case 'deleted':
      return <CloseIcon fontSize="inherit" color="action" />;
    case 'pending':
    default:
      return <AccessTimeIcon fontSize="inherit" color="action" />;
  }
};

const formatTimestamp = (ts) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const extractTextFromPayload = (payload) => {
  if (!payload) return null;
  if (payload.documentWithCaptionMessage?.message?.documentMessage?.caption) {
    return payload.documentWithCaptionMessage.message.documentMessage.caption;
  }
  if (payload.imageMessage?.caption) return payload.imageMessage.caption;
  if (payload.conversation) return payload.conversation;
  if (payload.extendedTextMessage?.text) return payload.extendedTextMessage.text;
  if (payload.message?.conversation) return payload.message.conversation;
  if (payload.message?.extendedTextMessage?.text) return payload.message.extendedTextMessage.text;
  if (payload.ephemeralMessage?.message?.conversation) return payload.ephemeralMessage.message.conversation;
  if (payload.ephemeralMessage?.message?.extendedTextMessage?.text) return payload.ephemeralMessage.message.extendedTextMessage.text;
  if (payload.viewOnceMessage?.message?.conversation) return payload.viewOnceMessage.message.conversation;
  if (payload.viewOnceMessage?.message?.extendedTextMessage?.text) return payload.viewOnceMessage.message.extendedTextMessage.text;
  if (payload.viewOnceMessageV2?.message?.conversation) return payload.viewOnceMessageV2.message.conversation;
  if (payload.viewOnceMessageV2?.message?.extendedTextMessage?.text) return payload.viewOnceMessageV2.message.extendedTextMessage.text;
  if (payload.listResponseMessage?.title) return payload.listResponseMessage.title;
  if (payload.buttonsResponseMessage?.selectedButtonId) return payload.buttonsResponseMessage.selectedButtonId;
  if (payload.protocolMessage?.type === 'HISTORY_SYNC_NOTIFICATION') return '[historial sincronizado]';
  return null;
};

const loadAuthToken = () => {
  const key = 'whatssuite-auth';
  const sources = [localStorage, sessionStorage];
  for (const store of sources) {
    try {
      const raw = store.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.token) return parsed.token;
    } catch (_) {
      // ignore parse errors
    }
  }
  return null;
};

const mediaCache = new Map();

const fetchMediaObjectUrl = async (media) => {
  if (!media?.relativePath) return null;
  if (mediaCache.has(media.relativePath)) return mediaCache.get(media.relativePath);
  const token = loadAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'whatssuite-frontend'
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch('/api/v1/media/stream', {
    method: 'POST',
    headers,
    body: JSON.stringify({ path: media.relativePath, sha: media.sha256 })
  });
  if (!resp.ok) throw new Error(`Media fetch failed (${resp.status})`);
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  mediaCache.set(media.relativePath, url);
  return url;
};

const documentIcon = (mime) => {
  if (!mime) return <InsertDriveFileIcon fontSize="small" color="action" />;
  if (mime.startsWith('image/')) return <ImageIcon fontSize="small" color="action" />;
  if (mime.startsWith('audio/')) return <AudiotrackIcon fontSize="small" color="action" />;
  if (mime.startsWith('video/')) return <MovieIcon fontSize="small" color="action" />;
  if (mime === 'application/pdf') return <PictureAsPdfIcon fontSize="small" color="error" />;
  return <InsertDriveFileIcon fontSize="small" color="action" />;
};

const renderMedia = (media, mediaUrl, onPreview) => {
  if (!media) return null;
  const url = mediaUrl;
  if (media.type === 'sticker' && url) {
    return (
      <Box sx={{ mt: 1, maxWidth: 180 }}>
        <Box
          component="img"
          src={url}
          alt="sticker"
          sx={(theme) => ({
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            p: 0.5
          })}
        />
      </Box>
    );
  }
  if (media.type === 'image' && url) {
    return (
      <Box sx={{ mt: 1, cursor: 'pointer', maxWidth: 220 }} onClick={() => onPreview?.({ url, type: 'image' })}>
        <Box
          component="img"
          src={url}
          alt={media.caption || 'imagen'}
          sx={{ width: '100%', height: 'auto', borderRadius: 2, objectFit: 'cover', display: 'block' }}
        />
        {media.caption && (
          <Typography variant="caption" color="text.secondary">
            {media.caption}
          </Typography>
        )}
      </Box>
    );
  }
  if (media.type === 'video' && url) {
    return (
      <Box sx={{ mt: 1 }}>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 260,
            height: 160,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
            cursor: 'pointer'
          }}
          onClick={() => onPreview?.({ url, type: 'video' })}
        >
          <video
            src={url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
            playsInline
            preload="metadata"
          />
        </Box>
        {media.caption && (
          <Typography variant="caption" color="text.secondary">
            {media.caption}
          </Typography>
        )}
      </Box>
    );
  }
  if (media.type === 'audio' && url) {
    return (
      <Box sx={(theme) => ({ mt: 1, p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.06) })}>
        <audio controls src={url} style={{ width: '100%' }} />
        <Typography variant="caption" color="text.secondary">
          {media.isVoiceNote ? 'Nota de voz' : 'Audio'}
          {media.duration ? ` • ${media.duration}s` : ''} {media.fileName ? `• ${media.fileName}` : ''}
        </Typography>
      </Box>
    );
  }
  if (media.type === 'document' && url) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
        {documentIcon(media.mimeType)}
        <Button size="small" variant="outlined" href={url} download={media.fileName || true} target="_blank" rel="noreferrer">
          {media.fileName || 'Descargar'}
        </Button>
      </Stack>
    );
  }
  return null;
};

const MessageBubble = ({ message, onPreview, onDelete }) => {
  const mine = message.direction === 'out';
  const isSystem =
    message.type === 'system' ||
    message.direction === 'system' ||
    message.messageType === 'SYSTEM' ||
    message?.content?.type === 'system';
  const content = message?.content || {};
  const deleted = Boolean(message.deletedForRemote || message.deleted_at || message.deletedAt || message.status === 'deleted');
  const extracted = extractTextFromPayload(content.payload);
  const text =
    typeof content === 'string'
      ? content
      : content.text || extracted || (deleted ? '' : '');
  const createdAt = new Date(message.timestamp || message.createdAt || Date.now());
  const editedAt = message.editedAt ? new Date(message.editedAt) : null;
  const [mediaUrl, setMediaUrl] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const media = content.media;

  useEffect(() => {
    let cancelled = false;
    setMediaError(null);
    if (!media) {
      setMediaUrl(null);
      return;
    }
    fetchMediaObjectUrl(media)
      .then((url) => {
        if (!cancelled) setMediaUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setMediaError(err?.message || 'No se pudo cargar el archivo');
      });
    return () => {
      cancelled = true;
    };
  }, [media]);

  return (
    <Box
      sx={(theme) => {
        const clientBg = theme.palette.action.hover;
        const systemBg = alpha(theme.palette.primary.main, 0.06);
        const agentBg = alpha(theme.palette.primary.main, 0.12);
        const bg = isSystem ? systemBg : mine ? agentBg : clientBg;
        const textColor = mine ? theme.palette.primary.dark : theme.palette.text.primary;
        const border = isSystem ? alpha(theme.palette.primary.main, 0.25) : theme.palette.divider;
        return {
          alignSelf: mine ? 'flex-end' : 'flex-start',
          bgcolor: bg,
          color: textColor,
          px: 1.5,
          py: 1,
          borderRadius: 1.5,
          maxWidth: { xs: '100%', md: '78%' },
          border: `1px solid ${mine ? alpha(theme.palette.primary.main, 0.3) : border}`,
          boxShadow: 'none',
          position: 'relative',
          paddingTop: mine && onDelete ? 2 : 1
        };
      }}
    >
      {mine && !deleted && onDelete && (
        <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
          <IconButton
            size="small"
            aria-label="Acciones de mensaje"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <ArrowDropDownIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { setAnchorEl(null); onDelete(message); }} sx={{ color: 'error.main' }}>
              Eliminar
            </MenuItem>
          </Menu>
        </Box>
      )}
      <Stack spacing={0.75}>
        <Typography
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            opacity: deleted ? 0.35 : 1,
            fontStyle: deleted ? 'italic' : 'normal'
          }}
        >
          {text}
        </Typography>
        {deleted && (
          <Typography variant="caption" color="text.secondary">
            Eliminado para el cliente
          </Typography>
        )}
        {mediaError && (
          <Typography variant="caption" color="error.main">
            {mediaError}
          </Typography>
        )}
        {renderMedia(content.media, mediaUrl, onPreview)}
        {Array.isArray(content.files) && content.files.length > 0 && (
          <Stack direction="column" spacing={0.5} sx={{ mt: 0.5 }}>
            {content.files.map((f, idx) => (
              <Chip
                key={`${f.name || 'file'}-${idx}`}
                size="small"
                label={`${f.name || 'archivo'}${f.type ? ` (${f.type})` : ''}${f.size ? ` • ${(f.size / 1024).toFixed(1)}KB` : ''}`}
                variant="outlined"
                color="default"
              />
            ))}
          </Stack>
        )}
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ opacity: 0.75 }}>
          <Typography variant="caption">
            {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>
          {mine && !deleted && (
            <Tooltip title={statusLabel(message.status)}>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>{renderStatusIcon(message.status)}</Box>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default MessageBubble;
