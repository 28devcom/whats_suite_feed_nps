import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const QueueUsersModal = ({
  open,
  onClose,
  queue,
  service,
  onError
}) => {
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const disabled = loading || !queue;

  /* ===================== LOAD ===================== */
  const loadUsers = useCallback(async () => {
    if (!queue) return;

    setLoading(true);
    try {
      const [assigned, allUsers] = await Promise.all([
        service.getQueueUsers(queue.id),
        service.listAllUsers()
      ]);

      setAssignedUsers(assigned || []);
      setAvailableUsers(allUsers || []);
    } catch (err) {
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [queue, service, onError]);

  useEffect(() => {
    if (open) loadUsers();
  }, [open, loadUsers]);

  /* ===================== DERIVED ===================== */
  const assignedIds = useMemo(
    () => new Set(assignedUsers.map(u => u.user_id || u.id)),
    [assignedUsers]
  );

  const selectableUsers = useMemo(
    () => availableUsers.filter(u => !assignedIds.has(u.id)),
    [availableUsers, assignedIds]
  );

  /* ===================== ACTIONS ===================== */
  const handleAdd = async () => {
    if (!userId || disabled) return;

    setLoading(true);
    try {
      await service.addUserToQueue(queue.id, userId);
      setUserId('');
      await loadUsers();
    } catch (err) {
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (uid) => {
    if (disabled) return;

    setLoading(true);
    try {
      await service.removeUserFromQueue(queue.id, uid);
      await loadUsers();
    } catch (err) {
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== RENDER ===================== */
  return (
    <Dialog
      open={open}
      onClose={disabled ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        Usuarios asignados a <strong>{queue?.name}</strong>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* ===================== ADD USER ===================== */}
          <Stack spacing={1}>
            <Typography variant="subtitle2">
              Agregar usuario a la cola
            </Typography>

            <Select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              fullWidth
              size="small"
              displayEmpty
              disabled={disabled}
            >
              <MenuItem value="">
                <em>Selecciona un usuario</em>
              </MenuItem>

              {selectableUsers.map(u => (
                <MenuItem key={u.id} value={u.id}>
                  {u.fullName || u.name || u.email} — {u.email}
                </MenuItem>
              ))}
            </Select>

            <Button
              variant="contained"
              onClick={handleAdd}
              disabled={disabled || !userId}
            >
              Agregar
            </Button>
          </Stack>

          {/* ===================== ASSIGNED ===================== */}
          <Typography variant="subtitle2">
            Usuarios asignados
          </Typography>

          {loading && (
            <Box display="flex" justifyContent="center">
              <CircularProgress size={24} />
            </Box>
          )}

          {!loading && assignedUsers.length === 0 && (
            <Alert severity="info">
              No hay usuarios asignados a esta cola.
            </Alert>
          )}

          <Stack spacing={1}>
            {assignedUsers.map(u => (
              <Stack
                key={`${u.queue_id}-${u.user_id}`}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={(theme) => ({
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 1,
                  bgcolor: theme.palette.background.paper
                })}
              >
                <Typography variant="body2">
                  {u.name || u.email || u.user_id}
                  {u.role && ` — Rol: ${u.role}`}
                </Typography>

                <Tooltip title="Quitar de la cola" arrow>
                  <span>
                    <IconButton
                      size="small"
                      edge="end"
                      color="error"
                      onClick={() => handleRemove(u.user_id)}
                      disabled={disabled}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QueueUsersModal;
