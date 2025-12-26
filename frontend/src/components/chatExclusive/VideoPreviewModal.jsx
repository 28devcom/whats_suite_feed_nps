import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, IconButton, Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

const VideoPreviewModal = ({ open, url, onClose }) => {
  const videoRef = useRef(null);

  /* ===================== CLEANUP ===================== */
  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [open]);

  if (!url) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="video-preview"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose?.();
      }}
      PaperProps={{
        sx: (theme) => ({
          bgcolor: alpha(theme.palette.common.black, 0.92),
          backdropFilter: 'blur(6px)'
        })
      }}
    >
      <DialogContent
        sx={(theme) => ({
          position: 'relative',
          p: 0,
          bgcolor: alpha(theme.palette.common.black, 0.9)
        })}
      >
        {/* ===================== CLOSE ===================== */}
        <IconButton
          aria-label="Cerrar vista previa"
          onClick={onClose}
          sx={(theme) => ({
            position: 'absolute',
            top: 12,
            right: 12,
            bgcolor: alpha(theme.palette.common.black, 0.6),
            color: theme.palette.common.white,
            zIndex: 10,
            '&:hover': {
              bgcolor: alpha(theme.palette.common.black, 0.8)
            }
          })}
        >
          <CloseIcon />
        </IconButton>

        {/* ===================== VIDEO ===================== */}
        <Box
          sx={(theme) => ({
            width: '100%',
            height: '100%',
            minHeight: '60vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: alpha(theme.palette.common.black, 0.85)
          })}
        >
          <video
            ref={videoRef}
            src={url}
            controls
            autoPlay={open}
            playsInline
            style={{
              width: '100%',
              maxHeight: '90vh',
              objectFit: 'contain',
              backgroundColor: 'transparent'
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPreviewModal;
