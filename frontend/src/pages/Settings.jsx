import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import PageLayout from '../components/PageLayout.jsx';
import createSettingsService from '../services/settings.service.js';
import { useAuth } from '../context/AuthContext.jsx';

const Settings = () => {
  const { token, logout } = useAuth();

  const settingsService = useMemo(
    () =>
      createSettingsService({
        getToken: () => token,
        onUnauthorized: async () =>
          logout({ remote: false, reason: 'Sesión expirada o inválida' })
      }),
    [token, logout]
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  const [form, setForm] = useState({
    autoAssignEnabled: false,
    gradualAssignmentEnabled: false,
    autoAssignIntervalSeconds: 30,
    maxChatsPerAgent: 10,
    whatsappHistoryDays: 30
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getChatSettings();
      setForm((prev) => ({ ...prev, ...(data || {}) }));
    } catch (err) {
      setSnackbar({
        severity: 'error',
        message: err?.message || 'Error al cargar configuración'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []); // eslint-disable-line

  const handleChange = (key) => (event) => {
    const value =
      event.target.type === 'checkbox'
        ? event.target.checked
        : event.target.value;

    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateChatSettings({
        autoAssignEnabled: Boolean(form.autoAssignEnabled),
        gradualAssignmentEnabled: Boolean(form.gradualAssignmentEnabled),
        autoAssignIntervalSeconds: Number(form.autoAssignIntervalSeconds),
        maxChatsPerAgent: Number(form.maxChatsPerAgent),
        whatsappHistoryDays: Number(form.whatsappHistoryDays)
      });
      setSnackbar({ severity: 'success', message: 'Configuración guardada correctamente' });
    } catch (err) {
      setSnackbar({
        severity: 'error',
        message: err?.message || 'No se pudo guardar la configuración'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Configuración"
    >
      <Stack spacing={3}>

        {/* AUTO-ASIGNACIÓN */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight={700}>
              Auto-asignación de chats
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Controla si el sistema asigna chats automáticamente a los agentes.
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={form.autoAssignEnabled}
                  onChange={handleChange('autoAssignEnabled')}
                  disabled={loading || saving}
                />
              }
              label="Activar auto-asignación"
            />
          </CardContent>
        </Card>

        {/* REGLAS DE ASIGNACIÓN */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight={700}>
              Reglas de asignación
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Define la frecuencia y límites por agente.
            </Typography>

            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.gradualAssignmentEnabled}
                    onChange={handleChange('gradualAssignmentEnabled')}
                    disabled={loading || saving}
                  />
                }
                label="Asignación gradual (1 chat por agente por ciclo)"
              />

              <Divider />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  type="number"
                  label="Intervalo (segundos)"
                  value={form.autoAssignIntervalSeconds}
                  onChange={handleChange('autoAssignIntervalSeconds')}
                  inputProps={{ min: 5 }}
                  helperText="Frecuencia del job automático"
                  fullWidth
                />
                <TextField
                  type="number"
                  label="Máx. chats por agente"
                  value={form.maxChatsPerAgent}
                  onChange={handleChange('maxChatsPerAgent')}
                  inputProps={{ min: 1 }}
                  helperText="Límite simultáneo"
                  fullWidth
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* HISTORIAL WHATSAPP */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight={700}>
              Historial de WhatsApp
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Controla cuántos días de mensajes se sincronizan al conectar un número.
            </Typography>

            <TextField
              type="number"
              label="Días de historial"
              value={form.whatsappHistoryDays}
              onChange={handleChange('whatsappHistoryDays')}
              inputProps={{ min: 1 }}
              helperText="Solo chats personales (no grupos)"
              sx={{ maxWidth: 280 }}
            />
          </CardContent>
        </Card>

        {/* ACCIONES */}
        <Card elevation={1}>
          <CardContent>
            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button
                variant="outlined"
                onClick={loadSettings}
                disabled={loading || saving}
              >
                Recargar
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={loading || saving}
              >
                Guardar cambios
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {snackbar && (
          <Alert severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </PageLayout>
  );
};

export default Settings;
