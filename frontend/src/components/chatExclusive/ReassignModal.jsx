import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';

const ReassignModal = ({
  open,
  onClose,
  chat,
  agents = [],
  connections = [],
  onConfirm,
  loading = false
}) => {
  const [agentId, setAgentId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const queueId = chat?.queueId ?? null;
  const disabled = loading || !chat;

  /* ===================== RESET ===================== */
  useEffect(() => {
    if (open) {
      setAgentId('');
      setSessionName('');
      setReason('');
      setError('');
    }
  }, [open]);

  /* ===================== FILTERED AGENTS ===================== */
  const filteredAgents = useMemo(() => {
    if (!queueId) return agents;
    const byQueue = agents.filter((a) => (a.queueIds || []).includes(queueId));
    if (byQueue.length === 0) return agents; // fallback cuando la cola ya no existe o no tiene miembros explícitos
    return byQueue;
  }, [agents, queueId]);

  /* ===================== VALIDATION ===================== */
  const canConfirm =
    !!agentId &&
    reason.trim().length >= 5 &&
    !disabled;

  const handleConfirm = () => {
    if (!agentId) {
      setError('Selecciona un agente de destino.');
      return;
    }

    if (reason.trim().length < 5) {
      setError('El motivo debe tener al menos 5 caracteres.');
      return;
    }

    setError('');
    onConfirm?.({
      toAgentId: agentId,
      sessionName: sessionName || undefined,
      reason: reason.trim()
    });
  };

  /* ===================== RENDER ===================== */
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Reasignar chat</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.2}>
          <Typography variant="body2" color="text.secondary">
            Esta acción es <strong>auditable</strong> y solo está permitida para
            <strong> ADMIN y SUPERVISOR</strong>.
            <br />
            El agente destino debe pertenecer a la misma cola del chat.
          </Typography>

          {error && <Alert severity="warning">{error}</Alert>}

          {/* ===================== AGENT ===================== */}
          <FormControl
            fullWidth
            disabled={disabled}
            error={!agentId && !!error}
          >
            <InputLabel id="reassign-agent">
              Agente destino
            </InputLabel>
            <Select
              labelId="reassign-agent"
              label="Agente destino"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              {filteredAgents.length === 0 && (
                <MenuItem disabled>
                  No hay agentes disponibles en esta cola
                </MenuItem>
              )}

              {filteredAgents.map(a => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name || a.email || a.username || a.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* ===================== CONNECTION ===================== */}
          <FormControl fullWidth disabled={disabled}>
            <InputLabel id="reassign-connection">
              Conexión (opcional)
            </InputLabel>
            <Select
              labelId="reassign-connection"
              label="Conexión (opcional)"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            >
              <MenuItem value="">
                Mantener conexión actual
              </MenuItem>

              {connections.map(c => {
                const name = c.sessionName || c.name;
                return (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* ===================== REASON ===================== */}
          <TextField
            label="Motivo de la reasignación"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            required
            disabled={disabled}
            error={!!error && reason.trim().length < 5}
            helperText="Mínimo 5 caracteres. Se guardará en auditoría."
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </Button>

        <Button
          variant="contained"
          color="warning"
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          {loading ? 'Reasignando…' : 'Confirmar reasignación'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReassignModal;
