import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  TextField,
  FormControlLabel,
  Alert
} from '@mui/material';

const QueueFormModal = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  queue
}) => {
  const isEdit = Boolean(queue?.id);

  const [form, setForm] = useState({
    name: '',
    description: '',
    active: true
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  /* ===================== RESET ===================== */
  useEffect(() => {
    if (!open) return;

    if (queue) {
      setForm({
        name: queue.name || '',
        description: queue.description || '',
        active: queue.active !== false
      });
    } else {
      setForm({ name: '', description: '', active: true });
    }

    setErrors({});
    setTouched({});
  }, [queue, open]);

  /* ===================== VALIDATION ===================== */
  const validate = useCallback((values) => {
    const e = {};

    if (!values.name.trim()) {
      e.name = 'El nombre de la cola es obligatorio';
    } else if (values.name.trim().length < 3) {
      e.name = 'Debe tener al menos 3 caracteres';
    }

    if (values.description && values.description.length > 250) {
      e.description = 'Máximo 250 caracteres';
    }

    return e;
  }, []);

  useEffect(() => {
    setErrors(validate(form));
  }, [form, validate]);

  const isValid = useMemo(
    () => Object.keys(errors).length === 0,
    [errors]
  );

  /* ===================== HANDLERS ===================== */
  const updateField = (field) => (e) => {
    const value =
      field === 'active' ? e.target.checked : e.target.value;

    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = () => {
    const validation = validate(form);
    setErrors(validation);
    setTouched({ name: true, description: true });

    if (Object.keys(validation).length > 0) return;

    onSubmit?.({
      ...form,
      name: form.name.trim(),
      description: form.description.trim()
    });
  };

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

  /* ===================== RENDER ===================== */
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {isEdit ? 'Editar cola' : 'Crear nueva cola'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!isEdit && (
            <Alert severity="info">
              Las colas permiten organizar chats y asignarlos a
              agentes específicos.
            </Alert>
          )}

          <TextField
            label="Nombre de la cola"
            value={form.name}
            onChange={updateField('name')}
            onBlur={() =>
              setTouched((p) => ({ ...p, name: true }))
            }
            fullWidth
            required
            error={touched.name && !!errors.name}
            helperText={touched.name && errors.name}
            inputProps={{ maxLength: 80 }}
          />

          <TextField
            label="Descripción"
            value={form.description}
            onChange={updateField('description')}
            onBlur={() =>
              setTouched((p) => ({ ...p, description: true }))
            }
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            error={touched.description && !!errors.description}
            helperText={
              errors.description ||
              `${form.description.length}/250`
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.active}
                onChange={updateField('active')}
              />
            }
            label="Cola activa"
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !isValid}
        >
          {loading
            ? 'Guardando…'
            : isEdit
            ? 'Guardar cambios'
            : 'Crear cola'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QueueFormModal;
