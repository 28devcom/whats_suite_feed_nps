import { useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { Box, Stack, Skeleton, CircularProgress } from '@mui/material';

const SCROLL_THRESHOLD = 120;

const ChatPanel = ({
  messages = [],
  renderMessage,
  footer,
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore = null,
  autoScrollKey = null
}) => {
  const scrollRef = useRef(null);
  const prevHeightRef = useRef(0);
  const isAtBottomRef = useRef(true);

  /* =========================
     SORT (estable)
  ========================== */
  const sortedMessages = useMemo(() => {
    if (!messages?.length) return [];
    const sortValue = (m) =>
      Number(new Date(m?.timestamp || m?.createdAt || 0).getTime()) || 0;
    const createdValue = (m) =>
      Number(new Date(m?.createdAt || m?.timestamp || 0).getTime()) || 0;
    const idValue = (m) => m?.whatsappMessageId || m?.id || '';
    return [...messages].sort((a, b) => {
      const ta = sortValue(a);
      const tb = sortValue(b);
      if (ta !== tb) return ta - tb;
      const ca = createdValue(a);
      const cb = createdValue(b);
      if (ca !== cb) return ca - cb;
      return idValue(a) < idValue(b) ? -1 : idValue(a) > idValue(b) ? 1 : 0;
    });
  }, [messages]);

  /* =========================
     SCROLL POSITION TRACKING
  ========================== */
  const handleScroll = useCallback(
    (evt) => {
      const el = evt.currentTarget;

      // Track bottom
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      isAtBottomRef.current = distanceFromBottom < SCROLL_THRESHOLD;

      // Load more (top)
      if (
        el.scrollTop <= 80 &&
        hasMore &&
        !loadingMore &&
        onLoadMore
      ) {
        prevHeightRef.current = el.scrollHeight;
        onLoadMore();
      }
    },
    [hasMore, loadingMore, onLoadMore]
  );

  /* =========================
     PRESERVE SCROLL ON LOAD MORE
  ========================== */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !loadingMore) return;

    const delta = el.scrollHeight - prevHeightRef.current;
    el.scrollTop = delta;
  }, [loadingMore]);

  /* =========================
     AUTO SCROLL (ONLY IF AT BOTTOM)
  ========================== */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (autoScrollKey === false) return;

    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [autoScrollKey, sortedMessages.length]);

  /* =========================
     RENDER
  ========================== */
  return (
    <Stack sx={{ flex: 1, minHeight: 0, bgcolor: 'background.paper' }}>
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: 2,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {/* Load older */}
        {hasMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            {loadingMore ? (
              <CircularProgress size={18} />
            ) : (
              <Skeleton variant="text" width={120} />
            )}
          </Box>
        )}

        {/* Initial loading */}
        {loading &&
          Array.from({ length: 6 }).map((_, idx) => (
            <Stack
              key={idx}
              spacing={0.75}
              sx={{ maxWidth: '70%' }}
            >
              <Skeleton
                variant="rectangular"
                height={36}
                sx={{ borderRadius: 2 }}
              />
              <Skeleton variant="text" width="35%" />
            </Stack>
          ))}

        {/* Messages */}
        {!loading &&
          sortedMessages.map((msg) =>
            renderMessage ? renderMessage(msg) : null
          )}
      </Box>

      {/* Footer */}
      {footer}
    </Stack>
  );
};

export default ChatPanel;
