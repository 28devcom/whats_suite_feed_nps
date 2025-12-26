import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const toDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const typeLabel = (type) => {
  switch (type) {
    case 'image':
      return 'Imagen';
    case 'file':
      return 'Archivo';
    case 'tts':
      return 'TTS';
    default:
      return 'Texto';
  }
};

const BroadcastTemplateSelector = ({ templates = [], selectedId, onSelect, onCreate, onDelete, busy = false }) => {
  const [draft, setDraft] = useState({ name: '', type: 'text', body: '' });
  const [upload, setUpload] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    const dataUrl = await toDataUrl(file);
    setUpload({ name: file.name, type: file.type, dataUrl });
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      setError(null);
      const payload = {
        name: draft.name,
        type: draft.type,
        body: draft.body,
        text: draft.body
      };
      if (upload) payload.media = upload;
      const tpl = await onCreate(payload);
      setDraft({ name: '', type: 'text', body: '' });
      setUpload(null);
      if (tpl?.id && onSelect) onSelect(tpl.id);
    } catch (err) {
      setError(err?.message || 'No se pudo crear el template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ height: '100%', width: '100%' }}>
      <Card variant="outlined" sx={{ width: '98%' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={700}>
              Plantillas
            </Typography>
            <Chip size="small" label={`${templates.length} guardadas`} />
          </Stack>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <TextField
              label="Nombre"
              size="small"
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              select
              label="Tipo"
              size="small"
              value={draft.type}
              onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
            >
              <MenuItem value="text">Texto</MenuItem>
              <MenuItem value="image">Imagen + texto</MenuItem>
              <MenuItem value="file">Archivo + texto</MenuItem>
              <MenuItem value="tts">TTS (nota de voz)</MenuItem>
            </TextField>
            <TextField
              label="Contenido (spintax opcional)"
              multiline
              fullWidth
              minRows={5}
              maxRows={10}
              value={draft.body}
              onChange={(e) => setDraft((prev) => ({ ...prev, body: e.target.value }))}
              sx={{ '& textarea': { lineHeight: 1.4 } }}
            />
            {(draft.type === 'image' || draft.type === 'file') && (
              <Button variant="outlined" component="label">
                {upload ? upload.name : 'Adjuntar archivo'}
                <input hidden type="file" accept={draft.type === 'image' ? 'image/*' : '*/*'} onChange={handleFile} />
              </Button>
            )}
            <Button
              variant="contained"
              size="medium"
              startIcon={<SaveIcon />}
              disabled={!draft.name || saving}
              onClick={handleCreate}
            >
              Guardar template
            </Button>
            {error && (
              <Typography variant="caption" color="error.main">
                {error}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 1, width: '100%' }}>
        <Stack spacing={1}>
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              variant="outlined"
              sx={{
                borderColor: tpl.id === selectedId ? 'primary.main' : 'divider',
                boxShadow: tpl.id === selectedId ? 4 : 0,
                transition: 'all 0.2s ease'
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack spacing={0.4}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {tpl.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {typeLabel(tpl.type)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant={tpl.id === selectedId ? 'contained' : 'outlined'}
                      startIcon={<CheckCircleIcon />}
                      onClick={() => onSelect && onSelect(tpl.id)}
                      disabled={busy}
                    >
                      Usar
                    </Button>
                    <Tooltip title="Eliminar">
                      <IconButton color="error" onClick={() => onDelete && onDelete(tpl.id)} disabled={busy}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {tpl.body?.slice(0, 180) || 'Sin contenido'}
                </Typography>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && (
            <Box
              sx={(theme) => ({
                p: 2,
                border: `1px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                color: 'text.secondary'
              })}
            >
              <Typography variant="body2">No hay plantillas guardadas.</Typography>
            </Box>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

export default BroadcastTemplateSelector;
