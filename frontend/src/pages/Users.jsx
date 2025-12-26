import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Snackbar,
  Stack,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import PageLayout from '../components/PageLayout.jsx';
import UsersTable from '../components/users/UsersTable.jsx';
import UserFormModal from '../components/users/UserFormModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import createUsersService from '../services/users.service.js';
import { ApiError } from '../api/client.js';
import usePermissions from '../hooks/usePermissions.js';
import { createAuditService } from '../services/audit.service.js';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';

const Users = () => {
  const { token, logout, user } = useAuth();
  const { hasRole } = usePermissions();
  const service = useMemo(
    () =>
      createUsersService({
        getToken: () => token,
        onUnauthorized: async () => logout({ remote: false, reason: 'Sesión expirada o inválida' })
      }),
    [token, logout]
  );
  const auditService = useMemo(
    () =>
      createAuditService({
        getToken: () => token,
        onUnauthorized: async () => logout({ remote: false, reason: 'Sesión expirada o inválida' })
      }),
    [token, logout]
  );

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, user: null });
  const [filters, setFilters] = useState({ query: '', status: 'ALL' });

  const showMessage = (message, severity = 'success') => setSnackbar({ message, severity });

  const logEvent = async (event, metadata = {}) => {
    try {
      await auditService.sendEvent({ event, metadata });
    } catch (_) {
      // ignore audit failures
    }
  };

  const handleError = (err) => {
    const msg = err instanceof ApiError ? err.message : err?.message || 'Error al procesar la petición';
    setError(msg);
    showMessage(msg, 'error');
    logEvent('user_action_error', { message: msg });
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await service.getUsers();
      setUsers(data || []);
    } catch (err) {
      handleError(err);
      logEvent('user_load_failed', {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = () => {
    if (!hasRole(['ADMIN'])) return;
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleEdit = (user) => {
    if (!hasRole(['ADMIN'])) return;
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    setLoading(true);
    try {
      if (editingUser) {
        await service.updateUser(editingUser.id, payload);
        showMessage('Usuario actualizado');
        logEvent('user_updated', { userId: editingUser.id });
      } else {
        await service.createUser(payload);
        showMessage('Usuario creado');
        logEvent('user_created', { email: payload.email });
      }
      setFormOpen(false);
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (!hasRole(['ADMIN'])) return;
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setLoading(true);
    try {
      await service.updateUser(user.id, { status: nextStatus });
      showMessage(`Usuario ${nextStatus === 'ACTIVE' ? 'activado' : 'desactivado'}`);
      logEvent('user_status_changed', { userId: user.id, status: nextStatus });
      await loadUsers();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (user) => {
    if (!hasRole(['ADMIN'])) return;
    setConfirmDelete({ open: true, user });
  };

  const confirmDeleteUser = async () => {
    const user = confirmDelete.user;
    if (!user) return;
    setLoading(true);
    try {
      await service.deleteUser(user.id, { confirm: user.status === 'ACTIVE' });
      showMessage('Usuario eliminado');
      logEvent('user_deleted', { userId: user.id, status: user.status });
      await loadUsers();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
      setConfirmDelete({ open: false, user: null });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      !filters.query ||
      u.name?.toLowerCase().includes(filters.query.toLowerCase()) ||
      u.email?.toLowerCase().includes(filters.query.toLowerCase());
    const matchesStatus = filters.status === 'ALL' ? true : (u.status || '').toUpperCase() === filters.status;
    return matchesQuery && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE').length,
    pending: users.filter((u) => (u.status || '').toUpperCase() === 'PENDING').length,
    inactive: users.filter((u) => (u.status || '').toUpperCase() === 'INACTIVE').length
  };

  return (
    <PageLayout title="Usuarios">
      <Stack spacing={2}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} alignItems="stretch">
          <Grid item xs={12} md={5} lg={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h6" fontWeight={800}>
                        Filtros y acciones
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Busca, filtra y crea usuarios
                      </Typography>
                    </Box>
                    <Chip label={`Rol: ${user?.role || 'N/D'}`} size="small" color="info" variant="outlined" />
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`Total ${stats.total}`} color="default" size="small" />
                    <Chip label={`Activos ${stats.active}`} color="success" size="small" />
                    <Chip label={`Pendientes ${stats.pending}`} color="warning" size="small" />
                    <Chip label={`Inactivos ${stats.inactive}`} color="default" size="small" />
                  </Stack>
                  <TextField
                    label="Buscar"
                    placeholder="Nombre o email"
                    size="small"
                    value={filters.query}
                    onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
                    fullWidth
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel id="user-status-filter-label">Estado</InputLabel>
                    <Select
                      labelId="user-status-filter-label"
                      label="Estado"
                      value={filters.status}
                      onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                    >
                      <MenuItem value="ALL">Todos</MenuItem>
                      <MenuItem value="ACTIVE">Activos</MenuItem>
                      <MenuItem value="PENDING">Pendientes</MenuItem>
                      <MenuItem value="ERROR">Error</MenuItem>
                      <MenuItem value="INACTIVE">Inactivos</MenuItem>
                    </Select>
                  </FormControl>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" size="small" onClick={() => setFilters({ query: '', status: 'ALL' })}>
                      Limpiar filtros
                    </Button>
                    <Button variant="contained" fullWidth onClick={handleCreate}>
                      Nuevo usuario
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7} lg={8}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <UsersTable
                  users={filteredUsers}
                  loading={loading}
                  onRefresh={loadUsers}
                  onEdit={handleEdit}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                  canEdit={hasRole(['ADMIN'])}
                  canToggle={hasRole(['ADMIN'])}
                  canDelete={hasRole(['ADMIN'])}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} loading={loading} user={editingUser} />

      <ConfirmDialog
        open={confirmDelete.open}
        title="Confirmar eliminación"
        description={`¿Eliminar al usuario ${confirmDelete.user?.email || ''}? Esta acción es irreversible.`}
        severity="danger"
        roleHint="ADMIN"
        onClose={() => setConfirmDelete({ open: false, user: null })}
        onConfirm={confirmDeleteUser}
        confirmLabel="Eliminar"
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        ) : null}
      </Snackbar>
    </PageLayout>
  );
};

export default Users;
