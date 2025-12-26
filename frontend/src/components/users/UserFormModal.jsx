import { useEffect, useMemo, useState, useCallback } from 'react';
import {
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
  Alert
} from '@mui/material';

const roles = ['ADMIN', 'SUPERVISOR', 'AGENTE'];
const statuses = ['ACTIVE', 'INACTIVE'];

const UserFormModal = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  user
}) => {
  const isEdit = Boolean(user?.id);

  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    role: 'AGENTE',
    status: 'ACTIVE',
    password: ''
  });

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  /* ===================== RESET ===================== */
  useEffect(() => {
    if (!open) return;

    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        role: user.role || 'AGENTE',
        status: user.status || 'ACTIVE',
        password: ''
      });
    } else {
      setForm({
        name: '',
        email: '',
        username: '',
        role: 'AGENTE',
        status: 'ACTIVE',
        password: ''
      });
    }

    setTouched({});
    setErrors({});
  }, [user, open]);

  /* ===================== VALIDATION ===================== */
  const validate = useCallback((values) => {
    const e = {};

    if (!values.name.trim()) {
      e.name = 'El nombre es obligatorio';
    }

    if (!values.email.trim()) {
      e.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      e.email = 'Email inválido';
    }

    if (!isEdit) {
      if (!values.password) {
        e.password = 'La contraseña es obligatoria';
      } else if (values.password.length < 6) {
        e.password = 'Mínimo 6 caracteres';
      }
    }

    return e;
  }, [isEdit]);

  useEffect(() => {
    setErrors(validate(form));
  }, [form, validate]);

  const isValid = useMemo(
    () => Object.keys(errors).length === 0,
    [errors]
  );

  /* ===================== HANDLERS ===================== */
  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = () => {
    const validation = validate(form);
    setErrors(validation);
    setTouched({
      name: true,
      email: true,
      password: true
    });

    if (Object.keys(validation).length > 0) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      username: form.username?.trim(),
      role: form.role,
      status: form.status
    };

    if (!isEdit || form.password) {
      payload.password = form.password;
    }

    onSubmit?.(payload);
  };

  /* ===================== RENDER ===================== */
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {isEdit ? 'Editar usuario' : 'Crear usuario'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!isEdit && (
            <Alert severity="info">
              La contraseña inicial podrá ser cambiada por el usuario.
            </Alert>
          )}

          <TextField
            label="Nombre completo"
            value={form.name}
            onChange={updateField('name')}
            onBlur={() => setTouched(p => ({ ...p, name: true }))}
            fullWidth
            required
            error={touched.name && !!errors.name}
            helperText={touched.name && errors.name}
          />

          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={updateField('email')}
            onBlur={() => setTouched(p => ({ ...p, email: true }))}
            fullWidth
            required
            error={touched.email && !!errors.email}
            helperText={touched.email && errors.email}
          />

          {!isEdit && (
            <TextField
              label="Contraseña"
              type="password"
              value={form.password}
              onChange={updateField('password')}
              onBlur={() => setTouched(p => ({ ...p, password: true }))}
              fullWidth
              required
              error={touched.password && !!errors.password}
              helperText={errors.password || 'Mínimo 6 caracteres'}
            />
          )}

          <FormControl fullWidth>
            <InputLabel id="role-label">Rol</InputLabel>
            <Select
              labelId="role-label"
              label="Rol"
              value={form.role}
              onChange={updateField('role')}
            >
              {roles.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="status-label">Estado</InputLabel>
            <Select
              labelId="status-label"
              label="Estado"
              value={form.status}
              onChange={updateField('status')}
            >
              <MenuItem value="ACTIVE">Activo</MenuItem>
              <MenuItem value="INACTIVE">Inactivo</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>

        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !isValid}
        >
          {loading
            ? 'Guardando…'
            : isEdit
            ? 'Guardar cambios'
            : 'Crear usuario'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserFormModal;
