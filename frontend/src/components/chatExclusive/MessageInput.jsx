import { useEffect, useMemo, useRef, useCallback } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';

import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CloseIcon from '@mui/icons-material/Close';

const KB = 1024;

const MessageInput = ({
  text = '',
  onTextChange,
  attachments = [],
  onRemoveAttachment,
  onFilesSelected,
  onSend,
  disabled = false,
  disabledReason = '',
  uploading = false,
  error,
  recordError,
  recording = false,
  recordPreviewUrl,
  onCancelRecording,
  recordSeconds = 0,
  onToggleRecording,
  maxMb = 6,
  uploadProgress = 0,
  accept = 'image/*,video/*,audio/*,application/pdf',
  maxChars = 4000
}) => {
  const fileInputRef = useRef(null);

  /* ===================== HELPERS ===================== */
  const maxBytes = maxMb * KB * KB;

  const tooltipText = useCallback(
    (fallback) => (disabled && disabledReason ? disabledReason : fallback),
    [disabled, disabledReason]
  );

  const controlButtonSx = useCallback((theme, active, color) => {
    const base = color === 'error' ? theme.palette.error.main : theme.palette.primary.main;
    const hover = color === 'error' ? theme.palette.error.dark : theme.palette.primary.dark;

    return {
      width: 44,
      height: 44,
      borderRadius: '50%',
      color: theme.palette.common.white,
      backgroundColor: active ? hover : base,
      boxShadow: `0 10px 24px ${alpha(base, 0.25)}`,
      transition: 'all 180ms ease',
      '&:hover': {
        backgroundColor: hover,
        boxShadow: `0 14px 30px ${alpha(base, 0.35)}`
      },
      '&.Mui-disabled': {
        opacity: 0.45,
        backgroundColor: theme.palette.action.disabledBackground,
        boxShadow: 'none'
      }
    };
  }, []);

  /* ===================== FILE PREVIEWS ===================== */
  const previews = useMemo(() => {
    return attachments.map((file, idx) => {
      const isImage = file.type?.startsWith('image/');
      const isAudio = file.type?.startsWith('audio/');
      const url = isImage ? URL.createObjectURL(file) : null;
      return { file, idx, isImage, isAudio, url };
    });
  }, [attachments]);

  useEffect(() => {
    return () => previews.forEach(p => p.url && URL.revokeObjectURL(p.url));
  }, [previews]);

  const canSend =
    !disabled &&
    !uploading &&
    !recording &&
    (text.trim().length > 0 || attachments.length > 0 || Boolean(recordPreviewUrl));

  /* ===================== HANDLERS ===================== */
  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const valid = files.filter(f => f.size <= maxBytes);
    onFilesSelected?.(valid);
    e.target.value = '';
  }, [onFilesSelected, maxBytes]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey && !recording) {
      e.preventDefault();
      if (canSend) onSend?.();
    }
  }, [onSend, recording, canSend]);

  /* ===================== RENDER ===================== */
  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        p: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.semanticColors.surfaceSecondary,
        '@keyframes pulse': {
          '0%': { transform: 'scale(1)', opacity: 1 },
          '50%': { transform: 'scale(1.1)', opacity: 0.4 },
          '100%': { transform: 'scale(1)', opacity: 1 }
        }
      })}
    >
      <Stack spacing={1.25}>
        {/* ===================== INPUT ROW ===================== */}
        <Stack direction="row" spacing={1.25} alignItems="flex-end">
          <TextField
            fullWidth
            size="small"
            placeholder="Escribe un mensaje"
            value={text}
            onChange={(e) => onTextChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || uploading}
            multiline
            maxRows={4}
            inputProps={{ maxLength: maxChars }}
            InputProps={{
              sx: (theme) => ({
                bgcolor: theme.palette.background.paper,
                borderRadius: 2
              })
            }}
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept={accept}
            onChange={handleFileChange}
          />

          <Tooltip title={tooltipText('Adjuntar archivo')} arrow>
            <span>
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading || recording}
                sx={(theme) => controlButtonSx(theme, false, 'primary')}
              >
                <AttachFileIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={tooltipText(recording ? 'Detener grabación' : 'Grabar audio')} arrow>
            <span>
              <IconButton
                onClick={onToggleRecording}
                disabled={disabled || uploading}
                sx={(theme) => controlButtonSx(theme, recording, recording ? 'error' : 'primary')}
              >
                {recording ? <StopCircleIcon /> : <MicRoundedIcon />}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={tooltipText('Enviar mensaje')} arrow>
            <span>
              <IconButton
                onClick={onSend}
                disabled={!canSend}
                sx={(theme) => controlButtonSx(theme, true, 'primary')}
              >
                <CloudUploadIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {/* ===================== META INFO ===================== */}
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {text.length}/{maxChars}
          </Typography>
          {error && <Typography variant="caption" color="error">{error}</Typography>}
          {recordError && <Typography variant="caption" color="error">{recordError}</Typography>}
        </Stack>

        {/* ===================== RECORDING ===================== */}
        {recording && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={(theme) => ({
              p: 1,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.error.main, 0.12),
              border: `1px solid ${theme.palette.error.main}`
            })}
          >
            <FiberManualRecordIcon
              sx={{ color: 'error.main', animation: 'pulse 1s infinite' }}
            />
            <Typography fontWeight={700} color="error.main">
              Grabando {recordSeconds}s
            </Typography>
          </Stack>
        )}

        {/* ===================== UPLOAD PROGRESS ===================== */}
        {uploading && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ height: 8, borderRadius: 99 }}
            />
            <Typography variant="caption">
              Subiendo {uploadProgress}%
            </Typography>
          </Box>
        )}

        {/* ===================== AUDIO PREVIEW ===================== */}
        {!recording && recordPreviewUrl && (
          <Stack direction="row" spacing={1} alignItems="center">
            <audio controls src={recordPreviewUrl} />
            <Button color="warning" onClick={onCancelRecording}>
              Cancelar
            </Button>
          </Stack>
        )}

        {/* ===================== ATTACHMENTS ===================== */}
        {previews.map((p) => (
          <Stack
            key={`${p.file.name}-${p.idx}`}
            direction="row"
            spacing={1}
            alignItems="center"
            sx={(theme) => ({
              p: 1,
              borderRadius: 2,
              bgcolor: theme.semanticColors.surface,
              border: `1px solid ${theme.palette.divider}`
            })}
          >
            <Avatar variant="rounded">
              {p.isImage ? <ImageIcon /> : p.isAudio ? <AudiotrackIcon /> : <InsertDriveFileIcon />}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap>{p.file.name}</Typography>
              <Typography variant="caption">
                {(p.file.size / KB).toFixed(1)} KB
              </Typography>
            </Box>

            {p.isImage && p.url && (
              <Box
                component="img"
                src={p.url}
                sx={{ width: 48, height: 48, borderRadius: 1 }}
              />
            )}

            <IconButton size="small" onClick={() => onRemoveAttachment?.(p.idx)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
};

export default MessageInput;
