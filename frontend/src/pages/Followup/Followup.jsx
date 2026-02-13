import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AutoFixHigh as AutoFixHighIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useNotify } from '../../context/NotifyContext.jsx';

const Followup = () => {
  const { notify } = useNotify();
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    days_inactive: 7,
    message_template: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rulesRes, logsRes] = await Promise.all([
        api.get('/followup/rules'),
        api.get('/followup/logs')
      ]);
      setRules(rulesRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      notify('Erro ao carregar dados de follow-up', 'error');
    }
  };

  const handleCreateRule = async () => {
    try {
      await api.post('/followup/rules', formData);
      notify('Regra de follow-up criada', 'success');
      setOpenDialog(false);
      fetchData();
    } catch (error) {
      notify('Erro ao criar regra', 'error');
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Excluir esta regra?')) return;
    try {
      await api.delete(`/followup/rules/${id}`);
      notify('Regra excluída', 'success');
      fetchData();
    } catch (error) {
      notify('Erro ao excluir regra', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">Follow-up Inteligente</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>Nova Regra</Button>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Regras de Automação</Typography>
          <Grid container spacing={2}>
            {rules.map((rule) => (
              <Grid item xs={12} key={rule.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">{rule.name}</Typography>
                        <Typography variant="body2" color="text.secondary">Inatividade: {rule.days_inactive} dias</Typography>
                      </Box>
                      <IconButton color="error" onClick={() => handleDeleteRule(rule.id)}><DeleteIcon /></IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Histórico de Envios</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Regra</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.customer_phone}</TableCell>
                    <TableCell>{log.rule_name}</TableCell>
                    <TableCell>{new Date(log.sent_at).toLocaleDateString()}</TableCell>
                    <TableCell><Chip label={log.status} size="small" color="success" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Nova Regra de Follow-up</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 400 }}>
            <TextField label="Nome da Regra" fullWidth value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Reengajamento 7 dias" />
            <TextField label="Dias de Inatividade" type="number" fullWidth value={formData.days_inactive} onChange={(e) => setFormData({...formData, days_inactive: e.target.value})} />
            <TextField label="Template da Mensagem" fullWidth multiline rows={4} value={formData.message_template} onChange={(e) => setFormData({...formData, message_template: e.target.value})} placeholder="Olá {{nome}}, sentimos sua falta..." />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateRule}>Salvar Regra</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Followup;
