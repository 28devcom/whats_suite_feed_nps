import { useMemo } from 'react';
import { Box, Button, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

const buildSegments = (texto = '') => {
  const segments = [];
  const regex = /\{([a-zA-Z0-9_.-]+)\}/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: texto.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'var', name: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < texto.length) {
    segments.push({ type: 'text', value: texto.slice(lastIndex) });
  }
  return segments;
};

const QuickReplyComposer = ({
  template,
  values = {},
  onChangeValue,
  onCancel,
  onSend,
  sending = false,
  disabled = false
}) => {
  const textoBase = template?.textoBase || template?.texto_base || '';
  const variables = template?.variables || [];
  const segments = useMemo(() => buildSegments(textoBase), [textoBase]);
  const ready = variables.every((v) => (values?.[v] || '').trim().length > 0);

  return (
    <Box
      sx={(theme) => ({
        p: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.semanticColors.surfaceSecondary
      })}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <Stack spacing={0.4}>
          <Typography variant="subtitle2" fontWeight={700}>
            Respuesta rápida
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {template?.titulo}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Texto base inmutable. Completa únicamente las variables.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="text" color="inherit" onClick={onCancel}>
            Salir
          </Button>
          <Button variant="contained" onClick={onSend} disabled={!ready || sending || disabled}>
            Enviar
          </Button>
        </Stack>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Box
        sx={(theme) => ({
          borderRadius: 2,
          border: `1px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
          bgcolor: theme.semanticColors.surface,
          p: 1.5,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center'
        })}
      >
        {segments.map((seg, idx) =>
          seg.type === 'text' ? (
            <Typography key={`text-${idx}`} variant="body2">
              {seg.value}
            </Typography>
          ) : (
            <TextField
              key={`var-${seg.name}-${idx}`}
              size="small"
              label={seg.name}
              value={values?.[seg.name] || ''}
              onChange={(e) => onChangeValue?.(seg.name, e.target.value)}
              onPaste={(e) => e.stopPropagation()}
              error={!values?.[seg.name]}
              helperText={!values?.[seg.name] ? 'Obligatoria' : ' '}
              sx={{ minWidth: 140 }}
              disabled={disabled || sending}
              inputProps={{ maxLength: 180 }}
            />
          )
        )}
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
        {variables.map((v) => (
          <Chip key={v} label={v} size="small" color="info" variant="outlined" />
        ))}
        {variables.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No hay variables declaradas.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default QuickReplyComposer;
