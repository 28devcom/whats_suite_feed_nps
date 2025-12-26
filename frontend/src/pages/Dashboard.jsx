import { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { Alert, Box, Card, CardContent, Grid, Skeleton, Stack, Typography, Divider } from '@mui/material';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext.jsx';
import createDashboardApi from '../services/dashboard.api.js';
import DateRangeFilter from '../components/DateRangeFilter.jsx';
import { ChartCard, PremiumBarChart, PremiumLineChart, ChartDrilldownModal } from '../components/charts/index.js';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';

/* ======================================================
   KPI CARD PREMIUM
====================================================== */
const KpiCard = memo(({ title, value, loading }) => (
  <Card
    elevation={0}
    sx={(theme) => ({
      height: '100%',
      background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? 'rgba(33,150,243,0.14)' : 'rgba(37,99,235,0.12)'}, ${
        theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.18)'
      })`,
      border: `1px solid ${theme.palette.divider}`,
      transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[6],
        borderColor: theme.palette.primary.main
      }
    })}
  >
    <CardContent>
      <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.3 }}>
        {title}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width="60%" height={34} sx={{ mt: 1 }} />
      ) : (
        <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
          {value ?? '—'}
        </Typography>
      )}
    </CardContent>
  </Card>
));

/* ======================================================
   DASHBOARD
====================================================== */
const Dashboard = () => {
  const { token, logout } = useAuth();

  const api = useMemo(
    () =>
      createDashboardApi({
        getToken: () => token,
        onUnauthorized: () =>
          logout({ remote: false, reason: 'Sesión expirada o inválida' })
      }),
    [token, logout]
  );

  const [filters, setFilters] = useState(() => ({
    fecha_inicio: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    fecha_fin: dayjs().format('YYYY-MM-DD')
  }));

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [error, setError] = useState(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownDatum, setDrilldownDatum] = useState(null);
  const [drilldownLevel, setDrilldownLevel] = useState('agent');

  /* =================== DATA MAPPERS =================== */
  const totals = useMemo(
    () => [
      { label: 'Entrantes', value: Number(overview?.mensajes_entrantes || 0) },
      { label: 'Salientes', value: Number(overview?.mensajes_salientes || 0) }
    ],
    [overview]
  );

  const mapSeries = useCallback(
    (key) =>
      timeseries.map(row => ({
        label: dayjs(row.date_key).format('DD/MM'),
        value: Number(row[key] || 0)
      })),
    [timeseries]
  );

  /* =================== LOAD DATA =================== */
  const loadData = useCallback(async () => {
    if (!filters.fecha_inicio || !filters.fecha_fin) return;

    setLoading(true);
    setError(null);

    try {
      const [ov, ts] = await Promise.all([
        api.getDashboardOverview(filters),
        api.getDashboardMessages(filters)
      ]);

      setOverview(ov);
      setTimeseries(ts);
    } catch (e) {
      setError(e?.message || 'Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  }, [api, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDrilldown = useCallback((datum, source) => {
    setDrilldownDatum({ ...datum, source });
    setDrilldownOpen(true);
  }, []);

  const handleDrilldownFilter = useCallback(
    async (level) => {
      setDrilldownLevel(level);
      try {
        const dd = await api.getDashboardDrilldown({ ...filters, level });
        setDrilldownDatum((prev) => (prev ? { ...prev, level, data: dd || [] } : null));
      } catch (e) {
        setError(e?.message || 'Error al cargar drilldown');
      }
    },
    [api, filters]
  );

  /* =================== RENDER =================== */
  return (
    <Box sx={{ minHeight: '100vh', p: 3 }}>
      <Stack spacing={3}>
        {/* HEADER */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
          spacing={2}
        >
          <Typography variant="h6" fontWeight={800}>
            Dashboard Operativo
          </Typography>

          <DateRangeFilter
            from={filters.fecha_inicio}
            to={filters.fecha_fin}
            loading={loading}
            onChange={(f) => setFilters(prev => ({ ...prev, ...f }))}
            onSubmit={loadData}
          />
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* KPI */}
        <Grid container spacing={2}>
          {[
            ['Total mensajes', overview?.total_mensajes],
            ['Entrantes', overview?.mensajes_entrantes],
            ['Salientes', overview?.mensajes_salientes],
            ['Chats abiertos', overview?.total_chats_abiertos],
            ['Chats cerrados', overview?.total_chats_cerrados],
            ['Tiempo resp. prom. (s)', overview?.tiempo_respuesta_promedio]
          ].map(([title, value]) => (
            <Grid key={title} item xs={12} sm={6} md={4} lg={2}>
              <KpiCard title={title} value={value} loading={loading} />
            </Grid>
          ))}
        </Grid>

        <Divider />

        {/* GRÁFICAS */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <ChartCard
              icon={<ShowChartRoundedIcon />}
              title="Mensajes totales por día"
              subtitle="Tendencia reciente"
            >
              {loading ? (
                <Skeleton variant="rectangular" height={240} />
              ) : (
                <PremiumLineChart
                  data={mapSeries('total_mensajes')}
                  height={260}
                  color="#22d3ee"
                  onSelect={(d) => handleDrilldown(d, 'Mensajes totales')}
                />
              )}
            </ChartCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <ChartCard
              icon={<BarChartRoundedIcon />}
              title="Distribución Entrantes / Salientes"
              subtitle="Volumen acumulado"
            >
              {loading ? (
                <Skeleton variant="rectangular" height={240} />
              ) : (
                <PremiumBarChart
                  data={totals}
                  height={240}
                  colors={['#60a5fa', '#2563eb']}
                  onSelect={(d) => handleDrilldown(d, 'Distribución')}
                />
              )}
            </ChartCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <ChartCard
              icon={<TimelineRoundedIcon />}
              title="Entrantes por día"
              subtitle="Detalle diario"
            >
              {loading ? (
                <Skeleton variant="rectangular" height={220} />
              ) : (
                <PremiumBarChart
                  data={mapSeries('mensajes_entrantes')}
                  height={240}
                  colors={['#1E40AF', '#1d4ed8']}
                  onSelect={(d) => handleDrilldown(d, 'Entrantes')}
                />
              )}
            </ChartCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <ChartCard
              icon={<QueryStatsRoundedIcon />}
              title="Salientes por día"
              subtitle="Detalle diario"
            >
              {loading ? (
                <Skeleton variant="rectangular" height={220} />
              ) : (
                <PremiumBarChart
                  data={mapSeries('mensajes_salientes')}
                  height={240}
                  colors={['#22c55e', '#16a34a']}
                  onSelect={(d) => handleDrilldown(d, 'Salientes')}
                />
              )}
            </ChartCard>
          </Grid>
        </Grid>

        <ChartDrilldownModal
          open={drilldownOpen}
          datum={drilldownDatum}
          onClose={() => setDrilldownOpen(false)}
          onFilterChange={handleDrilldownFilter}
        />
      </Stack>
    </Box>
  );
};

export default Dashboard;
