import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Snackbar, Slide, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

const NotifyContext = createContext(null);

const Transition = (props) => <Slide {...props} direction="down" />;

export const NotifyProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);

  const notify = useCallback(({ message, severity = 'info', duration = 4000 }) => {
    setToast({ message, severity, duration });
  }, []);

  const confirm = useCallback(({ title = 'Confirmar', message, onConfirm, onCancel }) => {
    setDialog({ title, message, onConfirm, onCancel });
  }, []);

  const handleCloseToast = () => setToast(null);
  const handleCloseDialog = () => setDialog(null);

  const value = useMemo(
    () => ({
      notify,
      confirm
    }),
    [notify, confirm]
  );

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={toast?.duration}
        onClose={handleCloseToast}
        TransitionComponent={Transition}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {toast && (
          <Alert onClose={handleCloseToast} severity={toast.severity} variant="filled" sx={{ minWidth: 280 }}>
            {toast.message}
          </Alert>
        )}
      </Snackbar>

      <Dialog open={Boolean(dialog)} onClose={handleCloseDialog} fullWidth maxWidth="xs">
        <DialogTitle>{dialog?.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{dialog?.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { dialog?.onCancel?.(); handleCloseDialog(); }}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={() => { dialog?.onConfirm?.(); handleCloseDialog(); }}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </NotifyContext.Provider>
  );
};

export const useNotify = () => {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify must be used within NotifyProvider');
  return ctx;
};
