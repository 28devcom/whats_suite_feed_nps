import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  ThumbUp as ThumbUpIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import createApiService from '../../services/api.service.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotify } from '../../context/NotifyContext.jsx';

const PostSalesAnalytics = () => {
  const { user } = useAuth();
  const { notify } = useNotify();
  const api = useMemo(() => createApiService({ getToken: () => user?.token }), [user]);

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    fetchKpis();
  }, [api]);

  const fetchKpis = async () => {
    try {
      const res = await api.get('/post-sales-analytics/kpis');
      setKpis(res);
    } catch (error) {
      notify('Erro ao carregar KPIs de pós-venda', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Dashboard Analítico de Pós-Venda</Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.light' }}>
                  <TrendingUpIcon color="primary" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">NPS Score</Typography>
                  <Typography variant="h5" fontWeight="bold">{kpis?.nps}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'success.light' }}>
                  <PeopleIcon color="success" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Taxa de Retenção</Typography>
                  <Typography variant="h5" fontWeight="bold">{kpis?.retention_rate}%</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'info.light' }}>
                  <ThumbUpIcon color="info" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Média de Score</Typography>
                  <Typography variant="h5" fontWeight="bold">{kpis?.avg_score}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'warning.light' }}>
                  <WarningIcon color="warning" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Respostas</Typography>
                  <Typography variant="h5" fontWeight="bold">{kpis?.total_responses}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Composição do NPS</Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2">Promotores: {kpis?.promoters}</Typography>
                  <Box sx={{ height: 8, bgcolor: 'success.main', borderRadius: 4, width: `${(kpis?.promoters / kpis?.total_responses) * 100 || 0}%` }} />
                </Box>
                <Box>
                  <Typography variant="body2">Passivos: {kpis?.passives}</Typography>
                  <Box sx={{ height: 8, bgcolor: 'warning.main', borderRadius: 4, width: `${(kpis?.passives / kpis?.total_responses) * 100 || 0}%` }} />
                </Box>
                <Box>
                  <Typography variant="body2">Detratores: {kpis?.detractors}</Typography>
                  <Box sx={{ height: 8, bgcolor: 'error.main', borderRadius: 4, width: `${(kpis?.detractors / kpis?.total_responses) * 100 || 0}%` }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PostSalesAnalytics;
