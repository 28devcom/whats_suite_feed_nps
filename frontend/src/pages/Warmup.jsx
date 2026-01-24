import { useEffect, useMemo, useState } from 'react';
import { warmupApi } from '../api/warmup.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Box,
  Grid,
  Paper,
  Stack,
  Typography,
  Chip,
  Button,
  Divider,
  LinearProgress,
  Tooltip,
  IconButton,
  Switch,
  Avatar
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import BoltIcon from '@mui/icons-material/Bolt';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ShieldIcon from '@mui/icons-material/Shield';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const ProfileChip = ({ profile }) => {
  const palette = {
    nuevo: 'warning',
    tibio: 'info',
    estable: 'success',
    recuperacion: 'error'
  };
  return <Chip size="small" color={palette[profile] || 'default'} label={profile || 'desconocido'} />;
};

const StatCard = ({ title, value, subtitle, icon: Icon, hint }) => (
  <Paper
    elevation={1}
    sx={(theme) => ({
      p: 2,
      height: '100%',
      border: `1px solid ${theme.palette.divider}`,
      background: theme.semanticColors.surfaceSecondary
    })}
  >
    <Stack direction="row" spacing={2} alignItems="center">
      <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 42, height: 42 }}>
        <Icon />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={800} noWrap>
          {value}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {hint ? (
        <Tooltip title={hint}>
          <InfoOutlinedIcon fontSize="small" color="action" />
        </Tooltip>
      ) : null}
    </Stack>
  </Paper>
);

const WarmupHeader = ({ onRefresh, running, simulate, onToggleSimulate, onToggleRun }) => (
  <Paper
    elevation={1}
    sx={(theme) => ({
      p: 3,
      border: `1px solid ${theme.palette.divider}`,
      background: theme.semanticColors.surfaceSecondary,
      mb: 2
    })}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h4" fontWeight={900}>
          Warmup Engine
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Cadencia humana, perfiles y seguridad de reputación para líneas internas.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            icon={<LocalFireDepartmentIcon />}
            color={running ? 'success' : 'default'}
            label={running ? 'En ejecución' : 'Pausado'}
            size="small"
          />
          <Chip
            icon={<ShieldIcon />}
            color={simulate ? 'info' : 'default'}
            label={simulate ? 'Simulación (no envía)' : 'Envío real'}
            size="small"
          />
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Simular
          </Typography>
          <Switch checked={simulate} onChange={onToggleSimulate} />
        </Stack>
        <Button
          variant="contained"
          startIcon={running ? <PauseIcon /> : <PlayArrowIcon />}
          color={running ? 'warning' : 'primary'}
          onClick={onToggleRun}
        >
          {running ? 'Pausar' : 'Iniciar'}
        </Button>
        <Tooltip title="Refrescar">
          <IconButton onClick={onRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  </Paper>
);

const WarmupTable = ({ lines }) => (
  <Paper
    elevation={1}
    sx={(theme) => ({
      p: 2,
      border: `1px solid ${theme.palette.divider}`,
      background: theme.semanticColors.surfaceSecondary
    })}
  >
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Typography variant="subtitle1" fontWeight={800}>
        Líneas en warmup
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {lines.length} activas
      </Typography>
    </Stack>
    <Divider sx={{ mb: 2 }} />
    <Stack spacing={1.5}>
      {lines.map((line) => (
        <Box
          key={line.id}
          sx={(theme) => ({
            display: 'grid',
            gridTemplateColumns: '1.2fr repeat(4, 1fr) 120px',
            gap: 12,
            alignItems: 'center',
            padding: '10px 12px',
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            background: theme.semanticColors.surfaceHover
          })}
        >
          <Stack spacing={0}>
            <Typography fontWeight={700}>{line.sessionName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {line.phone}
            </Typography>
          </Stack>
          <ProfileChip profile={line.profile} />
          <Stack spacing={0}>
            <Typography variant="body2" fontWeight={700}>
              {line.dailyUsed}/{line.dailyLimit} hoy
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min((line.dailyUsed / line.dailyLimit) * 100, 100)}
              sx={{ height: 6, borderRadius: 8 }}
            />
          </Stack>
          <Stack spacing={0}>
            <Typography variant="body2" fontWeight={700}>
              {line.lastStatus}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Últ. ciclo: {line.lastRun}
            </Typography>
          </Stack>
          <Stack spacing={0}>
            <Typography variant="body2" fontWeight={700}>
              {line.messagesSent} msgs
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Reply rate {line.replyRate}%
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" size="small" startIcon={<BoltIcon />}>
              Ciclo
            </Button>
          </Stack>
        </Box>
      ))}
    </Stack>
  </Paper>
);

const useWarmupData = ({ api }) => {
  const [simulate, setSimulate] = useState(false);
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    try {
      const st = await api.getStatus();
      setSimulate(Boolean(st.simulate));
      setRunning(Boolean(st.running) && !st.paused && !st.failShutdown);
    } catch (err) {
      console.error('Status warmup', err);
    }
  };

  const loadLines = async () => {
    setLoading(true);
    try {
      const res = await api.listLines();
      const items = Array.isArray(res?.items) ? res.items : [];
      setLines(
        items.map((item) => ({
          id: item.id,
          sessionName: item.sessionName,
          phone: item.phone || item.sessionName,
          profile: item.warmupProfile || 'estable',
          dailyUsed: Number(item.metrics?.sent || 0),
          dailyLimit: Number(item.metrics?.dailyLimit || 30),
          lastStatus: item.metrics?.lastError ? 'alerta' : 'OK',
          lastRun: item.metrics?.lastSentAt || 'N/A',
          messagesSent: Number(item.metrics?.sent || 0),
          replyRate: 0
        }))
      );
    } catch (err) {
      console.error('Lines warmup', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadLines();
  }, []);

  const refresh = () => {
    loadStatus();
    loadLines();
  };

  return { lines, simulate, setSimulate, running, setRunning, refresh, loading, api };
};

const Warmup = () => {
  const { token, logout } = useAuth();
  const api = useMemo(() => warmupApi(() => token, logout), [token, logout]);
  const { lines, simulate, setSimulate, running, setRunning, refresh, loading } = useWarmupData({ api });
  const totals = useMemo(
    () => ({
      messages: lines.reduce((acc, l) => acc + l.messagesSent, 0),
      contacts: 38,
      reply: Math.round(lines.reduce((acc, l) => acc + l.replyRate, 0) / lines.length),
      risk: 'bajo'
    }),
    [lines]
  );

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <WarmupHeader
        running={running}
        simulate={simulate}
        onRefresh={refresh}
        onToggleSimulate={async () => {
          const next = !simulate;
          setSimulate(next);
          try {
            await api.toggleSimulate(next);
          } catch (err) {
            console.error(err);
          }
        }}
        onToggleRun={async () => {
          try {
            if (running) {
              await api.pause();
              setRunning(false);
            } else {
              await api.start();
              setRunning(true);
            }
          } catch (err) {
            console.error(err);
          }
        }}
      />
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <StatCard title="Mensajes warmup (hoy)" value={totals.messages} subtitle="Sumatoria de todas las líneas" icon={BoltIcon} />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard title="Contactos distintos" value={totals.contacts} subtitle="Últimas 24h" icon={QueryStatsIcon} />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard title="Reply rate medio" value={`${totals.reply}%`} subtitle="Últimos ciclos" icon={ShieldIcon} />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard title="Nivel de riesgo" value={totals.risk} subtitle="Basado en eventos y bloqueos" icon={LocalFireDepartmentIcon} />
        </Grid>
      </Grid>

      {loading ? (
        <Paper sx={{ p: 2, textAlign: 'center' }}>Cargando...</Paper>
      ) : (
        <WarmupTable lines={lines} />
      )}
    </Box>
  );
};

export default Warmup;
