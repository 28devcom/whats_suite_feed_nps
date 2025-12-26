import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import ArticleIcon from '@mui/icons-material/Article';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import TextsmsIcon from '@mui/icons-material/Textsms';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReplayIcon from '@mui/icons-material/Replay';
import BroadcastConnectionSelector from './BroadcastConnectionSelector.jsx';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const toDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const resolveSpintax = (text) => {
  const pattern = /\{([^{}]+)\}/;
  if (typeof text !== 'string') return '';
  let output = text;
  let guard = 0;
  while (pattern.test(output) && guard < 50) {
    output = output.replace(pattern, (_m, body) => {
      const options = body.split('|');
      const choice = options[Math.floor(Math.random() * options.length)] ?? '';
      return resolveSpintax(choice);
    });
    guard += 1;
  }
  return output;
};

const BroadcastForm = ({
  connections = [],
  onSubmit,
  sending = false,
  selectedTemplate = null,
  onTemplateClear
}) => {
  const [form, setForm] = useState({
    name: '',
    messageType: 'text',
    text: '',
    delayMin: 400,
    delayMax: 1200,
    recipientsText: '',
    connections: [],
    templateId: null,
    startAt: '',
    stopAt: ''
  });
  const [file, setFile] = useState(null);
  const [xlsxFile, setXlsxFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [xlsxInputKey, setXlsxInputKey] = useState(0);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState(null);
  const [xlsxVars, setXlsxVars] = useState([]);
  const textRef = useRef(null);

  useEffect(() => {
    if (selectedTemplate) {
      setForm((prev) => ({
        ...prev,
        templateId: selectedTemplate.id,
        messageType: selectedTemplate.type,
        text: selectedTemplate.body || '',
        name: prev.name || selectedTemplate.name
      }));
      setFile(null);
    }
  }, [selectedTemplate]);

  const recipients = useMemo(
    () =>
      form.recipientsText
        .split(/\n|,/)
        .map((r) => r.trim())
        .filter(Boolean),
    [form.recipientsText]
  );

  const handleFileChange = async (evt) => {
    const f = evt.target.files?.[0];
    if (!f) return;
    const dataUrl = await toDataUrl(f);
    setFile({ name: f.name, type: f.type, dataUrl });
  };

  const handleXlsxChange = async (evt) => {
    const f = evt.target.files?.[0];
    if (!f) return;
    const dataUrl = await toDataUrl(f);
    setXlsxFile({ name: f.name, type: f.type, dataUrl });
  };

  useEffect(() => {
    if (!xlsxFile) {
      setXlsxVars([]);
      return;
    }
    import('xlsx').then((xlsx) => {
      try {
        const workbook = xlsx.read(xlsxFile.dataUrl.split(',')[1], { type: 'base64' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
        const header = rows?.[0] || [];
        const vars = header.slice(1).map((h, idx) => (h ? String(h).trim() : `var${idx + 1}`));
        setXlsxVars(vars);
      } catch (err) {
        setXlsxVars([]);
        setError('XLSX inválido');
      }
    });
  }, [xlsxFile]);

  const handlePreview = () => {
    const text = resolveSpintax(form.text || selectedTemplate?.body || '');
    setPreview(text);
  };

  const insertVariable = (variable) => {
    const placeholder = `{{${variable}}}`;
    setForm((prev) => {
      const el = textRef.current;
      if (el && typeof el.selectionStart === 'number') {
        const start = el.selectionStart;
        const end = el.selectionEnd ?? start;
        const before = prev.text.slice(0, start);
        const after = prev.text.slice(end);
        const next = `${before}${placeholder}${after}`;
        requestAnimationFrame(() => {
          const pos = before.length + placeholder.length;
          el.setSelectionRange(pos, pos);
          el.focus();
        });
        return { ...prev, text: next };
      }
      const appended = `${prev.text || ''} ${placeholder}`.trim();
      return { ...prev, text: appended };
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('Asigna un nombre a la campaña');
      return;
    }
    if (!xlsxFile && !recipients.length) {
      setError('Agrega al menos un destinatario');
      return;
    }
    if (!form.connections.length) {
      setError('Selecciona conexiones de WhatsApp');
      return;
    }
    const missingVars = xlsxVars.filter((v) => {
      if (!v) return false;
      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'i');
      return !re.test(form.text || '');
    });
    if (missingVars.length && xlsxVars.length) {
      setError(`Faltan variables en el mensaje: ${missingVars.join(', ')}`);
      return;
    }

    const payload = {
      name: form.name.trim(),
      messageType: form.messageType,
      text: form.text,
      delayMin: Number(form.delayMin) || 0,
      delayMax: Number(form.delayMax) || 0,
      recipients: xlsxFile ? [] : recipients,
      connections: form.connections,
      templateId: form.templateId,
      tts: {},
      startAt: form.startAt || null,
      stopAt: form.stopAt || null
    };
    if (file && (form.messageType === 'image' || form.messageType === 'file')) {
      payload.file = file;
    }
    if (xlsxFile) {
      payload.xlsx = xlsxFile;
    }
    const startDate = form.startAt ? new Date(form.startAt) : null;
    const stopDate = form.stopAt ? new Date(form.stopAt) : null;
    if (startDate && Number.isNaN(startDate.getTime())) {
      setError('Hora de inicio inválida');
      return;
    }
    if (stopDate && Number.isNaN(stopDate.getTime())) {
      setError('Hora fin inválida');
      return;
    }
    if (startDate && stopDate && startDate > stopDate) {
      setError('La hora de inicio debe ser antes de la hora fin');
      return;
    }
    try {
      await onSubmit(payload);
      setForm((prev) => ({
        ...prev,
        name: '',
        text: '',
        recipientsText: '',
        messageType: 'text',
        templateId: null,
        startAt: '',
        stopAt: ''
      }));
      setFile(null);
      setXlsxFile(null);
      setFileInputKey((k) => k + 1);
      setXlsxInputKey((k) => k + 1);
    } catch (err) {
      setError(err?.message || 'Error enviando campaña');
    }
  };

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack spacing={0.2}>
              <Typography variant="h6" fontWeight={800}>
                Nueva campaña de broadcast
              </Typography>
            </Stack>
            <Chip label={`${recipients.length} destinatarios`} color="primary" variant="outlined" />
          </Stack>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={8}>
            <Stack spacing={1.5}>
              <TextField
                label="Nombre de campaña"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
<ToggleButtonGroup
                exclusive
                value={form.messageType}
                onChange={(_e, val) => val && setForm((prev) => ({ ...prev, messageType: val, templateId: prev.templateId }))}
                color="primary"
                size="small"
              >
                <ToggleButton value="text">
                  <TextsmsIcon fontSize="small" sx={{ mr: 1 }} />
                  Texto
                </ToggleButton>
                <ToggleButton value="image">
                  <ImageIcon fontSize="small" sx={{ mr: 1 }} />
                  Imagen
                </ToggleButton>
                <ToggleButton value="file">
                  <ArticleIcon fontSize="small" sx={{ mr: 1 }} />
                  Archivo
                </ToggleButton>
                <ToggleButton value="tts">
                  <GraphicEqIcon fontSize="small" sx={{ mr: 1 }} />
                  TTS
                </ToggleButton>
              </ToggleButtonGroup>
              {(form.messageType === 'image' || form.messageType === 'file') && (
                <Box>
                  <Button variant="outlined" component="label">
                    {file ? file.name : 'Subir archivo'}
                    <input
                      hidden
                      type="file"
                      accept={form.messageType === 'image' ? 'image/*' : '*/*'}
                      key={fileInputKey}
                      onClick={(e) => {
                        e.target.value = null;
                      }}
                      onChange={handleFileChange}
                    />
                  </Button>
                  {selectedTemplate?.id && !file && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      Usando adjunto del template seleccionado.
                    </Typography>
                  )}
                </Box>
              )}
              {xlsxVars.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  {xlsxVars.map((v) => (
                    <Tooltip key={v} title="Insertar variable">
                      <Chip
                        label={`{{${v}}}`}
                        onClick={() => insertVariable(v)}
                        variant="outlined"
                        size="small"
                        sx={{ cursor: 'pointer' }}
                      />
                    </Tooltip>
                  ))}
                </Stack>
              )}
              <TextField
                label="Mensaje (spintax soportado)"
                multiline
                minRows={4}
                value={form.text}
                onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
                inputRef={textRef}
                helperText="Usa {Hola|Buen día} para variaciones automáticas"
              />
              <TextField
                label="Destinatarios (uno por línea o separados por coma)"
                multiline
                minRows={4}
                value={form.recipientsText}
                onChange={(e) => setForm((prev) => ({ ...prev, recipientsText: e.target.value }))}
                disabled={Boolean(xlsxFile)}
                helperText={xlsxFile ? 'Los destinatarios se tomarán de la primera columna del XLSX' : undefined}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Delay mínimo (ms)"
                  type="number"
                  value={form.delayMin}
                  onChange={(e) => setForm((prev) => ({ ...prev, delayMin: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start">≥</InputAdornment> }}
                />
                <TextField
                  label="Delay máximo (ms)"
                  type="number"
                  value={form.delayMax}
                  onChange={(e) => setForm((prev) => ({ ...prev, delayMax: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start">≤</InputAdornment> }}
                />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<VisibilityIcon />} onClick={handlePreview}>
                  Vista previa
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={handleSubmit}
                  disabled={sending}
                  color="primary"
                >
                  {sending ? 'Enviando...' : 'Enviar con worker'}
                </Button>
                <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                  XLSX con variables
                  <input
                    hidden
                    type="file"
                    accept=".xlsx"
                    key={xlsxInputKey}
                    onClick={(e) => {
                      e.target.value = null;
                    }}
                    onChange={handleXlsxChange}
                  />
                </Button>
                {xlsxFile && (
                  <Chip
                    label={xlsxFile.name}
                    onDelete={() => {
                      setXlsxFile(null);
                      setXlsxVars([]);
                      setXlsxInputKey((k) => k + 1);
                    }}
                    variant="outlined"
                    color="info"
                    size="small"
                  />
                )}
                {selectedTemplate?.id && (
                  <Button variant="text" color="secondary" startIcon={<ReplayIcon />} onClick={onTemplateClear}>
                    Quitar template
                  </Button>
                )}
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Hora inicio"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={form.startAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))}
                  inputProps={{ step: 60 }}
                />
                <TextField
                  label="Hora fin"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={form.stopAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, stopAt: e.target.value }))}
                  inputProps={{ step: 60 }}
                />
              </Stack>
              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              {preview && (
                <Alert severity="info" icon={<VisibilityIcon />}>
                  <Typography variant="subtitle2">Vista previa</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {preview}
                  </Typography>
                </Alert>
              )}
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <BroadcastConnectionSelector
              connections={connections}
              value={form.connections}
              onChange={(conn) => setForm((prev) => ({ ...prev, connections: conn }))}
              disabled={sending}
            />
            {selectedTemplate && (
              <Box
                sx={(theme) => ({
                  mt: 2,
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px dashed ${theme.palette.divider}`,
                  background: theme.semanticColors.surfaceHover
                })}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  Template activo: {selectedTemplate.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedTemplate.body}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default BroadcastForm;
