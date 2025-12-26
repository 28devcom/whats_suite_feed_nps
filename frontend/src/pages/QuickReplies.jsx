import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  FormControlLabel,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PageLayout from '../components/PageLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import createQuickRepliesService from '../services/quickReplies.service.js';
import { ApiError } from '../api/client.js';

const extractVariables = (texto = '') => {
  const regex = /\{([a-zA-Z0-9_.-]+)\}/g;
  const vars = new Set();
  let match;
  while ((match = regex.exec(texto)) !== null) {
    if (match[1]) vars.add(match[1]);
  }
  return Array.from(vars);
};

const QuickReplies = () => {
  const { token, logout } = useAuth();
  const service = useMemo(
    () =>
      createQuickRepliesService({
        getToken: () => token,
        onUnauthorized: async () => logout({ remote: false, reason: 'Sesión expirada o inválida' })
      }),
    [token, logout]
  );

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [form, setForm] = useState({ id: null, titulo: '', textoBase: '', activo: true });
  const [snackbar, setSnackbar] = useState(null);
  const [error, setError] = useState(null);

  const variables = useMemo(() => extractVariables(form.textoBase), [form.textoBase]);

  const resetForm = () => setForm({ id: null, titulo: '', textoBase: '', activo: true });

  const handleError = (err) => {
    const msg = err instanceof ApiError ? err.message : err?.message || 'Error al procesar';
    setError(msg);
    setSnackbar({ severity: 'error', message: msg });
  };

  const loadQuickReplies = async (append = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await service.list({
        search: filters.search?.trim() || '',
        cursor: append ? cursor : null,
        limit: 20,
        active: undefined
      });
      const list = res?.items || [];
      setItems((prev) => (append ? [...prev, ...list] : list));
      setCursor(res?.nextCursor || null);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuickReplies(false);
  }, [filters.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!form.titulo.trim() || !form.textoBase.trim()) {
      setSnackbar({ severity: 'warning', message: 'Título y texto base son obligatorios' });
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await service.update(form.id, {
          titulo: form.titulo.trim(),
          textoBase: form.textoBase.trim(),
          variables,
          activo: form.activo
        });
        setSnackbar({ severity: 'success', message: 'Respuesta actualizada' });
      } else {
        await service.create({
          titulo: form.titulo.trim(),
          textoBase: form.textoBase.trim(),
          variables,
          activo: form.activo
        });
        setSnackbar({ severity: 'success', message: 'Respuesta creada' });
      }
      resetForm();
      await loadQuickReplies(false);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      id: item.id,
      titulo: item.titulo,
      textoBase: item.textoBase,
      activo: item.activo
    });
  };

  const handleToggle = async (item) => {
    try {
      if (item.activo) {
        await service.remove(item.id);
        setSnackbar({ severity: 'info', message: 'Respuesta desactivada' });
      } else {
        await service.update(item.id, { activo: true });
        setSnackbar({ severity: 'success', message: 'Respuesta activada' });
      }
      await loadQuickReplies(false);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDeactivate = async (item) => {
    try {
      await service.remove(item.id);
      setSnackbar({ severity: 'info', message: 'Respuesta desactivada' });
      await loadQuickReplies(false);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <PageLayout title="Respuestas rápidas">
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            label="Buscar"
            placeholder="Título"
            size="small"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            InputProps={{
              endAdornment: (
                <IconButton size="small" onClick={() => setFilters({ search: '' })}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              )
            }}
          />
          <Chip label={`${items.length} respuestas`} size="small" color="info" variant="outlined" />
          <Box sx={{ flex: 1 }} />
          <Button startIcon={<RefreshIcon />} onClick={() => loadQuickReplies(false)} disabled={loading}>
            Refrescar
          </Button>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={(theme) => ({
                p: 2,
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.semanticColors.surface
              })}
            >
              <Stack spacing={1.5}>
                <Typography variant="h6">{form.id ? 'Editar respuesta' : 'Nueva respuesta'}</Typography>
                <TextField
                  label="Título"
                  value={form.titulo}
                  onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
                  inputProps={{ maxLength: 160 }}
                  required
                />
                <TextField
                  label="Texto base"
                  value={form.textoBase}
                  onChange={(e) => setForm((prev) => ({ ...prev, textoBase: e.target.value }))}
                  multiline
                  minRows={4}
                  maxRows={8}
                  placeholder="Incluye variables como {nombre} {pedido}"
                />
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  {variables.length ? (
                    variables.map((v) => <Chip key={v} label={v} size="small" color="primary" variant="outlined" />)
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No hay variables detectadas. Usa llaves para declararlas.
                    </Typography>
                  )}
                </Stack>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.activo}
                      onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
                    />
                  }
                  label="Activa"
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSubmit}
                    disabled={saving}
                  >
                    Guardar
                  </Button>
                  <Button variant="text" onClick={resetForm}>
                    Limpiar
                  </Button>
                </Stack>
                
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Stack spacing={1.5}>
              {items.map((item) => (
                <Paper
                  key={item.id}
                  elevation={0}
                  sx={(theme) => ({
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.semanticColors.surfaceSecondary
                  })}
                >
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack spacing={0.25}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {item.titulo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Última actualización: {new Date(item.updatedAt || item.updated_at || item.createdAt || '').toLocaleString()}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Editar">
                        <span>
                          <IconButton size="small" onClick={() => handleEdit(item)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={item.activo ? 'Desactivar' : 'Activar'}>
                        <span>
                          <IconButton size="small" onClick={() => handleToggle(item)}>
                            {item.activo ? <CancelOutlinedIcon color="warning" /> : <CheckCircleIcon color="success" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Desactivar (auditable)">
                        <span>
                          <IconButton size="small" onClick={() => handleDeactivate(item)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {item.textoBase}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    <Chip label={item.activo ? 'Activa' : 'Inactiva'} size="small" color={item.activo ? 'success' : 'default'} />
                    {(item.variables || []).map((v) => (
                      <Chip key={`${item.id}-${v}`} label={v} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Paper>
              ))}
              {!items.length && !loading && (
                <Paper
                  elevation={0}
                  sx={(theme) => ({
                    p: 2,
                    textAlign: 'center',
                    borderRadius: 3,
                    border: `1px dashed ${theme.palette.divider}`
                  })}
                >
                  <Typography variant="body2" color="text.secondary">
                    No hay respuestas registradas. Crea la primera para estandarizar los mensajes.
                  </Typography>
                </Paper>
              )}
              {cursor && (
                <Button variant="outlined" onClick={() => loadQuickReplies(true)} disabled={loading}>
                  Cargar más
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Stack>

      <Snackbar open={Boolean(snackbar)} autoHideDuration={4000} onClose={() => setSnackbar(null)}>
        {snackbar && (
          <Alert severity={snackbar.severity || 'info'} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </PageLayout>
  );
};

export default QuickReplies;
