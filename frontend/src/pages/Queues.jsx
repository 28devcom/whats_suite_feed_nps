import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Snackbar, Stack, Typography, Tooltip, IconButton, Divider } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageLayout from '../components/PageLayout.jsx';
import QueueList from '../components/queues/QueueList.jsx';
import QueueFormModal from '../components/queues/QueueFormModal.jsx';
import QueueUsersModal from '../components/queues/QueueUsersModal.jsx';
import QueueWhatsAppsModal from '../components/queues/QueueWhatsAppsModal.jsx';
import createQueuesService from '../api/services/queues.service.js';
import { useAuth } from '../context/AuthContext.jsx';
import AccessDenied from '../components/AccessDenied.jsx';
import { ApiError } from '../api/client.js';
import usePermissions from '../hooks/usePermissions.js';

const Queues = () => {
  const { token, logout } = useAuth();
  const { hasRole } = usePermissions();
  const allowed = hasRole(['ADMIN', 'SUPERVISOR']);
  const service = useMemo(
    () =>
      createQueuesService({
        getToken: () => token,
        onUnauthorized: async () => logout({ remote: false, reason: 'Sesión expirada o inválida' })
      }),
    [token, logout]
  );

  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [usersModal, setUsersModal] = useState({ open: false, queue: null });
  const [waModal, setWaModal] = useState({ open: false, queue: null });

  const handleError = (err) => {
    const msg = err instanceof ApiError ? err.message : err?.message || 'Error';
    setError(msg);
    setSnackbar({ severity: 'error', message: msg });
  };

  const loadQueues = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await service.getQueues();
      setQueues(data || []);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      loadQueues();
    }
  }, [allowed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (payload) => {
    setLoading(true);
    try {
      if (editing) {
        await service.updateQueue(editing.id, payload);
        setSnackbar({ severity: 'success', message: 'Cola actualizada' });
      } else {
        await service.createQueue(payload);
        setSnackbar({ severity: 'success', message: 'Cola creada' });
      }
      setFormOpen(false);
      setEditing(null);
      await loadQueues();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (queue) => {
    if (!queue) return;
    if (!window.confirm(`¿Eliminar la cola ${queue.name}?`)) return;
    setLoading(true);
    try {
      await service.deleteQueue(queue.id);
      setSnackbar({ severity: 'success', message: 'Cola eliminada' });
      await loadQueues();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) {
    return <AccessDenied description="Solo administradores y supervisores pueden gestionar colas." />;
  }

  return (
    <PageLayout>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
        <Stack spacing={0.25}>
          <Typography variant="h6" fontWeight={700}>
            Colas
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refrescar">
            <IconButton onClick={loadQueues} disabled={loading} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button variant="contained" onClick={() => setFormOpen(true)}>
            Nueva cola
          </Button>
        </Stack>
      </Stack>
      <Divider sx={{ my: 2 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ opacity: loading ? 0.6 : 1 }}>
        <QueueList
          queues={queues}
          onEdit={(q) => {
            setEditing(q);
            setFormOpen(true);
          }}
          onDelete={handleDelete}
          onManageUsers={(q) => setUsersModal({ open: true, queue: q })}
          onManageWhatsApps={(q) => setWaModal({ open: true, queue: q })}
        />
      </Box>

      <QueueFormModal open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} queue={editing} loading={loading} />
      <QueueUsersModal
        open={usersModal.open}
        onClose={() => setUsersModal({ open: false, queue: null })}
        queue={usersModal.queue}
        service={service}
        onError={handleError}
      />
      <QueueWhatsAppsModal
        open={waModal.open}
        onClose={() => setWaModal({ open: false, queue: null })}
        queue={waModal.queue}
        service={service}
        onError={handleError}
      />

      <Snackbar open={Boolean(snackbar)} autoHideDuration={4000} onClose={() => setSnackbar(null)}>
        {snackbar && (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </PageLayout>
  );
};

export default Queues;
