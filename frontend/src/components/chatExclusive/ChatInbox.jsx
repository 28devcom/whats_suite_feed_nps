import { useCallback, useEffect, useRef } from 'react';
import {
  Box,
  IconButton,
  List,
  Stack,
  Tooltip,
  Typography,
  Skeleton,
  Divider,
  CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import ChatItem from './ChatItem.jsx';
import EmptyState from '../ui/EmptyState.jsx';

const CHAT_LIST_WIDTH = 320;
const SKELETON_ITEMS = 10;

const ChatInbox = ({
  chats = [],
  activeId,
  onSelect,
  onRefresh,
  unreadCounts = {},
  loading = false,
  onLoadMore,
  hasMore = false,
  loadingMore = false
}) => {
  const listRef = useRef(null);
  const sentinelRef = useRef(null);

  const maybeLoadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore || !onLoadMore) return;
    const el = listRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceToBottom <= 120) {
      onLoadMore();
    }
  }, [hasMore, loading, loadingMore, onLoadMore]);

  const handleScroll = useCallback(() => {
    maybeLoadMore();
  }, [maybeLoadMore]);

  useEffect(() => {
    // Si el contenido no llena la vista, intenta cargar más automáticamente.
    maybeLoadMore();
  }, [chats, maybeLoadMore]);

  useEffect(() => {
    const root = listRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasMore || loading || loadingMore || !onLoadMore) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      { root, rootMargin: '160px 0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, onLoadMore]);

  return (
    <Box
      sx={(theme) => ({
        width: { xs: '100%', md: CHAT_LIST_WIDTH },
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.semanticColors?.surfaceSecondary || 'background.paper',
        borderRight: `1px solid ${theme.palette.divider}`
      })}
    >
      {/* ================= HEADER ================= */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1 }}
      >
        <Typography variant="subtitle2" fontWeight={700}>
          Inbox
        </Typography>

        <Tooltip title="Refrescar">
          <IconButton size="small" onClick={onRefresh}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider />

      {/* ================= LIST ================= */}
      <List
        disablePadding
        ref={listRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto'
        }}
        onScroll={handleScroll}
      >
        {/* Loading skeleton */}
        {loading &&
          Array.from({ length: SKELETON_ITEMS }).map((_, idx) => (
            <Stack
              key={idx}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ px: 2, py: 1 }}
            >
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="65%" height={16} />
                <Skeleton variant="text" width="40%" height={14} />
              </Box>
            </Stack>
          ))}

        {/* Empty state */}
        {!loading && chats.length === 0 && (
          <Box sx={{ px: 2, py: 4 }}>
            <EmptyState
              title="Sin chats"
              description="No hay conversaciones en esta pestaña."
            />
          </Box>
        )}

        {/* Chats */}
        {!loading &&
          chats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              selected={chat.id === activeId}
              onSelect={onSelect}
              unread={unreadCounts[chat.id] || 0}
            />
          ))}

        {/* Load more */}
        {hasMore && !loading && (
          <Box
            sx={{
              py: 1.5,
              display: 'flex',
              justifyContent: 'center'
            }}
            ref={sentinelRef}
          >
            <Tooltip title="Cargar más">
              <span>
                <IconButton
                  size="small"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <CircularProgress size={20} />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )}
      </List>
    </Box>
  );
};

export default ChatInbox;
