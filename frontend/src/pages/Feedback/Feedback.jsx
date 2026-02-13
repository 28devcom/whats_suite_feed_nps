import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  LinearProgress,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import api from '../../services/api';
import { useNotify } from '../../context/NotifyContext.jsx';

const Feedback = () => {
  const theme = useTheme();
  const { notify } = useNotify();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total_responses: 0,
    avg_score: 0,
    nps_score: 0,
    promoters: 0,
    detractors: 0,
    passives: 0
  });
  const [templates, setTemplates] = useState([]);
  const [responses, setResponses] = useState([]);
  const [settings, setSettings] = useState({
    enabled: false,
    wait_time_hours: 2,
    trigger_event: 'CHAT_CLOSED',
    template_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, templatesRes, settingsRes, responsesRes] = await Promise.all([
        api.get('/feedback/stats'),
        api.get('/feedback/templates'),
        api.get('/feedback/settings'),
        api.get('/feedback/responses')
      ]);
      setStats(statsRes.data);
      setTemplates(templatesRes.data);
      setSettings(settingsRes.data);
      setResponses(responsesRes.data);
    } catch (error) {
      notify('Erro ao carregar dados de feedback', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = async (field, value) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    try {
      await api.put('/feedback/settings', newSettings);
      notify('Configurações atualizadas', 'success');
    } catch (error) {
      notify('Erro ao atualizar configurações', 'error');
    }
  };

  const renderDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card sx={{ bgcolor: theme.palette.primary.main, color: 'white' }}>
          <CardContent>
            <Typography variant="h6">NPS Score</Typography>
            <Typography variant="h2" fontWeight="bold">{stats.nps_score}</Typography>
            <Typography variant="body2">Baseado em {stats.total_responses} respostas</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Distribuição de Feedback</Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" display="flex" justifyContent="space-between">
                <span>Promotores (9-10)</span>
                <span>{stats.promoters}</span>
              </Typography>
              <LinearProgress variant="determinate" value={(stats.promoters / stats.total_responses) * 100 || 0} color="success" sx={{ height: 10, borderRadius: 5, mb: 2 }} />
              
              <Typography variant="body2" display="flex" justifyContent="space-between">
                <span>Passivos (7-8)</span>
                <span>{stats.passives}</span>
              </Typography>
              <LinearProgress variant="determinate" value={(stats.passives / stats.total_responses) * 100 || 0} color="warning" sx={{ height: 10, borderRadius: 5, mb: 2 }} />
              
              <Typography variant="body2" display="flex" justifyContent="space-between">
                <span>Detratores (0-6)</span>
                <span>{stats.detractors}</span>
              </Typography>
              <LinearProgress variant="determinate" value={(stats.detractors / stats.total_responses) * 100 || 0} color="error" sx={{ height: 10, borderRadius: 5 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>Respostas Recentes</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Template</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Comentário</TableCell>
                <TableCell>Data</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {responses.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.customer_phone}</TableCell>
                  <TableCell>{row.template_name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={row.score} 
                      color={row.score >= 9 ? 'success' : row.score <= 6 ? 'error' : 'warning'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{row.comment || '-'}</TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  );

  const renderTemplates = () => (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<AddIcon />}>Novo Template</Button>
      </Box>
      <Grid container spacing={3}>
        {templates.map((tpl) => (
          <Grid item xs={12} md={4} key={tpl.id}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6">{tpl.name}</Typography>
                <Chip label={tpl.type} size="small" sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, height: 60, overflow: 'hidden' }}>
                  {tpl.message_text}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <IconButton color="error" size="small"><DeleteIcon /></IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderSettings = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Automação de Feedback</Typography>
        <Stack spacing={3} sx={{ mt: 3, maxWidth: 500 }}>
          <FormControlLabel
            control={<Switch checked={settings.enabled} onChange={(e) => handleSettingsChange('enabled', e.target.checked)} />}
            label="Ativar envio automático pós-atendimento"
          />
          <TextField
            select
            label="Template para envio"
            value={settings.template_id}
            onChange={(e) => handleSettingsChange('template_id', e.target.value)}
            fullWidth
          >
            {templates.map((tpl) => (
              <MenuItem key={tpl.id} value={tpl.id}>{tpl.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            type="number"
            label="Tempo de espera (horas)"
            value={settings.wait_time_hours}
            onChange={(e) => handleSettingsChange('wait_time_hours', e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Evento de disparo"
            value={settings.trigger_event}
            onChange={(e) => handleSettingsChange('trigger_event', e.target.value)}
            fullWidth
          >
            <MenuItem value="CHAT_CLOSED">Chat Encerrado</MenuItem>
            <MenuItem value="FIRST_INTERACTION">Primeira Interação</MenuItem>
          </TextField>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">Feedback & NPS</Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab icon={<DashboardIcon />} label="Dashboard" iconPosition="start" />
          <Tab icon={<HistoryIcon />} label="Templates" iconPosition="start" />
          <Tab icon={<SettingsIcon />} label="Configurações" iconPosition="start" />
        </Tabs>
      </Box>

      {tabValue === 0 && renderDashboard()}
      {tabValue === 1 && renderTemplates()}
      {tabValue === 2 && renderSettings()}
    </Box>
  );
};

export default Feedback;
