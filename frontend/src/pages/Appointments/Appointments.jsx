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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useNotify } from '../../context/NotifyContext.jsx';

const Appointments = () => {
  const { notify } = useNotify();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    customer_phone: '',
    customer_name: '',
    start_at: '',
    description: ''
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data);
    } catch (error) {
      notify('Erro ao carregar agendamentos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/appointments', formData);
      notify('Agendamento criado com sucesso', 'success');
      setOpenDialog(false);
      fetchAppointments();
    } catch (error) {
      notify('Erro ao criar agendamento', 'error');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      notify('Status atualizado', 'success');
      fetchAppointments();
    } catch (error) {
      notify('Erro ao atualizar status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este agendamento?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      notify('Agendamento excluído', 'success');
      fetchAppointments();
    } catch (error) {
      notify('Erro ao excluir agendamento', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'success';
      case 'CANCELLED': return 'error';
      case 'PENDING': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">Agendamentos</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>Novo Agendamento</Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appointments.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{new Date(row.start_at).toLocaleString()}</TableCell>
                <TableCell>{row.customer_name || '-'}</TableCell>
                <TableCell>{row.customer_phone}</TableCell>
                <TableCell><Chip label={row.status} color={getStatusColor(row.status)} size="small" /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" color="success" onClick={() => handleUpdateStatus(row.id, 'CONFIRMED')}><CheckIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleUpdateStatus(row.id, 'CANCELLED')}><CloseIcon /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(row.id)}><DeleteIcon /></IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Novo Agendamento</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 400 }}>
            <TextField label="Nome do Cliente" fullWidth value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} />
            <TextField label="Telefone" fullWidth value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} />
            <TextField label="Data e Hora" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={formData.start_at} onChange={(e) => setFormData({...formData, start_at: e.target.value})} />
            <TextField label="Descrição" fullWidth multiline rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Appointments;
