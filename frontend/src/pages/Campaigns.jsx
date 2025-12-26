import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useAuth } from '../context/AuthContext.jsx';
import PermissionGate from '../components/PermissionGate.jsx';
import SkeletonList from '../components/ui/SkeletonList.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageLayout from '../components/PageLayout.jsx';

const Campaigns = () => {
  const { apiClientInstance } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ name: '', templateId: '', whatsappSessionId: '', scheduledAt: '' });
  const [targetsText, setTargetsText] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tpls, cmps] = await Promise.all([
        apiClientInstance.request('/mass/templates'),
        apiClientInstance.request('/mass/campaigns')
      ]);
      setTemplates(tpls);
      setCampaigns(cmps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData().catch(() => {});
  }, []);

  const submitCampaign = async () => {
    const targets = targetsText
      .split(/\n|,/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((contact) => ({ contact }));
    await apiClientInstance.request('/mass/campaigns', {
      method: 'POST',
      body: { ...form, targets }
    });
    setForm({ name: '', templateId: '', whatsappSessionId: '', scheduledAt: '' });
    setTargetsText('');
    await loadData();
  };

  const statusColor = (status) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'scheduled':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const renderCampaigns = useMemo(
    () =>
      campaigns.length === 0 ? (
        <EmptyState title="Sin campañas" description="Crea una campaña para comenzar a enviar mensajes masivos." />
      ) : (
        campaigns.map((c) => (
          <Card key={c.id} variant="outlined" sx={{ mb: 2, bgcolor: 'background.paper', transition: 'transform 0.2s ease' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack spacing={0.5}>
                  <Typography variant="h6">{c.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Template: {c.template_id?.slice(0, 8) || 'N/D'} | Sesión WA: {c.whatsapp_session_id || 'N/D'}
                  </Typography>
                </Stack>
                <Chip label={c.status} color={statusColor(c.status)} variant="outlined" />
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Chip icon={<TimelineIcon />} label={`Destinos: ${c.total_targets || 0}`} size="small" />
                {c.scheduled_at && <Chip label={`Prog: ${new Date(c.scheduled_at).toLocaleString()}`} size="small" />}
              </Stack>
            </CardContent>
          </Card>
        ))
      ),
    [campaigns]
  );

  return (
    <PageLayout
      title="Campañas masivas"
      subtitle="Programadas o manuales, con plantillas y deduplicación de contactos."
      actions={
        <Tooltip title="Refrescar">
          <IconButton onClick={loadData}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      }
      maxWidth="lg"
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <PermissionGate fallback={<Typography color="text.secondary">No tienes permisos para crear campañas.</Typography>} roles={['ADMIN', 'SUPERVISOR']}>
            <Card sx={{ bgcolor: 'background.paper' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <AddIcon color="primary" />
                  <Typography variant="h6">Nueva campaña</Typography>
                </Stack>
                <Stack spacing={2}>
                  <TextField label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
                  <FormControl fullWidth>
                    <InputLabel>Template</InputLabel>
                    <Select
                      label="Template"
                      value={form.templateId}
                      onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                    >
                      {templates.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Sesión WhatsApp (opcional)"
                    placeholder="UUID de sesión"
                    value={form.whatsappSessionId}
                    onChange={(e) => setForm({ ...form, whatsappSessionId: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Programar (ISO 8601)"
                    placeholder="2025-12-31T23:59:00Z"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Destinos (uno por línea o separados por coma)"
                    multiline
                    minRows={4}
                    value={targetsText}
                    onChange={(e) => setTargetsText(e.target.value)}
                    helperText="Se deduplican automáticamente por campaña"
                  />
                  <Button variant="contained" onClick={submitCampaign} disabled={!form.name || !form.templateId}>
                    Crear campaña
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </PermissionGate>
        </Grid>

        <Grid item xs={12} md={7}>
          <PermissionGate roles={['ADMIN', 'SUPERVISOR', 'AGENTE']}>
            {loading ? <SkeletonList rows={4} withAvatar={false} /> : renderCampaigns}
          </PermissionGate>
        </Grid>
      </Grid>
    </PageLayout>
  );
};

export default Campaigns;
