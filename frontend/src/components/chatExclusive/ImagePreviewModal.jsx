import { Dialog, DialogContent, IconButton, Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { useState } from 'react';

const ImagePreviewModal = ({ open, url, onClose }) => {
  const [zoomed, setZoomed] = useState(false);

  const handleClose = () => {
    setZoomed(false);
    onClose?.();
  };

  if (!url) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen
      aria-labelledby="image-preview"
      PaperProps={{
        sx: (theme) => ({
          bgcolor: alpha(theme.palette.common.black, 0.94)
        })
      }}
    >
      <DialogContent
        sx={{
          position: 'relative',
          p: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
        onClick={handleClose}
      >
        {/* Botón cerrar */}
        <IconButton
          aria-label="Cerrar vista previa"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          sx={(theme) => ({
            position: 'fixed',
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

        {/* Imagen */}
        <Box
          component="img"
          src={url}
          alt="Vista previa de imagen"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
          sx={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            cursor: zoomed ? 'zoom-out' : 'zoom-in',
            transition: 'transform 200ms ease',
            transform: zoomed ? 'scale(1.6)' : 'scale(1)',
            userSelect: 'none'
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreviewModal;
