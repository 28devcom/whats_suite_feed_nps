import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Paper, Typography, IconButton, Stack, Button, Fab, Badge } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { getEventsSocket } from '../lib/eventsSocket.js';

const playBeep = async () => {
  const audioUrl = '/notification.wav';
  try {
    if (!NotificationHub.audio) {
      const audio = new Audio(audioUrl);
      audio.volume = 0.5;
      audio.preload = 'auto';
      NotificationHub.audio = audio;
    }
    await NotificationHub.audio.play();
  } catch (err) {
    // ignore failures (autoplay, load)
  }
};

const buildPreview = (message = {}) => {
  const content = message.content || {};
  if (typeof content === 'string') return content;
  if (content.text) return content.text;
  if (content.media?.fileName) return `Media: ${content.media.fileName}`;
  if (content.media?.type) return `Media: ${content.media.type}`;
  return message.messageType || 'Nuevo mensaje';
};

const NotificationHub = () => {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [openPanel, setOpenPanel] = useState(false);
  const socketRef = useRef(null);
  const userRef = useRef(null);
  const navigateRef = useRef(null);
  const navigate = useNavigate();
  const TTL_MS = 120000; // guardamos notificaciones 2 minutos

  const socket = useMemo(() => getEventsSocket(token), [token]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!socket) return undefined;
    socketRef.current = socket;

    socket.on('connect', () => {});
    socket.on('connect_error', () => {});
    socket.on('disconnect', () => {});

    const pushNotification = (evt) => {
      const chat = evt?.chat;
      const message = evt?.message;
      // Solo notificaciones de entrada (direction !== 'out')
      if (message?.direction === 'out' || evt?.direction === 'out') return;

      const chatId = evt?.chatId || chat?.id || message?.chatId;
      const from = evt?.sender || chat?.remoteNumber || message?.remoteNumber || 'Desconocido';
      const preview = buildPreview(message || chat?.lastMessage || {});

      // Control de visibilidad por rol: ADMIN/SUPERVISOR ven todo; AGENTE sólo sus chats asignados.
      const currentUser = userRef.current;
      if (currentUser?.role === 'AGENTE') {
        const assigned = chat?.assignedUserId || chat?.assignedAgentId;
        // Si no viene info de asignación en el evento, no filtramos para evitar perder alertas; solo bloqueamos si está asignado a otro.
        if (assigned && assigned !== currentUser.id) {
          return;
        }
      }

      const baseId = evt?.messageId || evt?.message?.id || evt?.message?.whatsappMessageId || chatId;
      const item = {
        id: baseId,
        chatId,
        from,
        preview,
        ts: Date.now()
      };

      let isDuplicate = false;
      setItems((prev) => {
        const filtered = prev.filter((p) => Date.now() - p.ts < TTL_MS);
        // evita duplicados por mismo id
        const exists = filtered.find((p) => p.id === item.id);
        if (exists) {
          isDuplicate = true;
          return filtered;
        }
        const next = [...filtered, item];
        return next.slice(-10);
      });
      if (!isDuplicate) setOpenPanel(true);

      if (!isDuplicate) playBeep();
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'default') Notification.requestPermission().catch(() => {});
        if (Notification.permission === 'granted') {
          try {
            const n = new Notification(`Nuevo mensaje de ${from}`, { body: preview, tag: item.id });
            n.onclick = () => navigateRef.current?.(`/chat?chatId=${chatId || ''}`);
          } catch (_) {
            // ignore notification errors
          }
        }
      }
    };

    const handleMessageUpdate = (evt) => {
      // optional: could show status change; for now ignore
      return evt;
    };

    const shouldIgnore = (evt) => {
      const chat = evt?.chat;
      const message = evt?.message;
      const jid = chat?.remoteJid || message?.remoteJid || '';
      // WhatsApp grupos terminan en @g.us; ignoramos esos eventos
      return typeof jid === 'string' && jid.endsWith('@g.us');
    };

    const handleNew = (evt) => {
      if (shouldIgnore(evt)) return;
      pushNotification(evt);
    };

    socket.on('message:new', handleNew);
    socket.on('message:media', handleNew);
    socket.on('message:update', handleMessageUpdate);

    return () => {
      socket.off('message:new', handleNew);
      socket.off('message:media', handleNew);
      socket.off('message:update', handleMessageUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) => prev.filter((it) => Date.now() - it.ts < TTL_MS));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!token) return null;

  const openChat = (chatId) => {
    setOpenPanel(false);
    navigate(`/chat?chatId=${chatId || ''}`);
    if (!chatId) {
      setItems([]);
    } else {
      setItems((prev) => prev.filter((p) => p.chatId !== chatId));
    }
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1400, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
      {openPanel && (
        <Paper
          elevation={8}
          sx={(theme) => ({
            p: 1.5,
            mb: 1,
            minWidth: 300,
            maxWidth: 360,
            maxHeight: '50vh',
            overflowY: 'auto',
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: `0 18px 38px ${alpha(theme.palette.primary.main, 0.14)}`
          })}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Notificaciones
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small" onClick={() => setItems([])}>
                Limpiar
              </Button>
              <IconButton size="small" onClick={() => setOpenPanel(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
          {items.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Sin notificaciones
            </Typography>
          )}
          {items.map((item) => (
            <Paper key={item.id} variant="outlined" sx={(theme) => ({ p: 1, mb: 1, borderColor: theme.palette.divider, ':last-of-type': { mb: 0 } })}>
              <Typography variant="caption" color="text.secondary">
                {new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {item.from}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {item.preview}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" onClick={() => openChat(item.chatId)}>
                  Ver chat
                </Button>
                <Button size="small" variant="text" onClick={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}>
                  Ocultar
                </Button>
              </Stack>
            </Paper>
          ))}
        </Paper>
      )}
      <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <Badge
          color="error"
          overlap="circular"
          badgeContent={items.length || null}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ '& .MuiBadge-badge': { zIndex: 10 } }}
        >
          <Fab color="primary" size="medium" onClick={() => setOpenPanel((prev) => !prev)} sx={{ position: 'relative', zIndex: 1 }}>
            <NotificationsIcon />
          </Fab>
        </Badge>
      </Box>
    </Box>
  );
};

export default NotificationHub;
