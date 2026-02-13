import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
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
  Stack,
  CircularProgress
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import createApiService from '../../services/api.service.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotify } from '../../context/NotifyContext.jsx';

const Retention = () => {
  const { user } = useAuth();
  const { notify } = useNotify();
  const api = useMemo(() => createApiService({ getToken: () => user?.token }), [user]);

  const [stats, setStats] = useState(null);
  const [atRisk, setAtRisk] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [api]);

  const fetchData = async () => {
    try {
      const [statsRes, atRiskRes] = await Promise.all([
        api.get('/retention/stats'),
        api.get('/retention/at-risk')
      ]);
      setStats(statsRes);
      setAtRisk(atRiskRes);
    } catch (error) {
      notify('Erro ao carregar dados de retenção', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Retenção e Reengajamento</Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <CheckCircleIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats?.segments.active}</Typography>
                  <Typography variant="body2" color="text.secondary">Clientes Ativos</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <WarningIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats?.segments.at_risk}</Typography>
                  <Typography variant="body2" color="text.secondary">Clientes em Risco</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <CancelIcon color="error" fontSize="large" />
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats?.segments.inactive}</Typography>
                  <Typography variant="body2" color="text.secondary">Clientes Perdidos</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>Clientes em Risco de Churn</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente (Telefone)</TableCell>
                  <TableCell>Última Interação</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {atRisk.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.customer_phone}</TableCell>
                    <TableCell>{new Date(row.last_interaction).toLocaleDateString()}</TableCell>
                    <TableCell><Chip label="Em Risco" color="warning" size="small" /></TableCell>
                  </TableRow>
                ))}
                {atRisk.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">Nenhum cliente em risco identificado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Retention;
