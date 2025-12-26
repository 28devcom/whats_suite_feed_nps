import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, reason: authReason } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const reason = location.state?.reason || authReason;

  useEffect(() => {
    if (user) {
      const home = user.role === 'AGENTE' ? '/chat' : '/status';
      navigate(home, { replace: true });
    }
  }, [user, navigate]);

  const validate = useCallback(() => {
    const nextErrors = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Email inválido';
    }
    if (!form.password || form.password.length < 8) {
      nextErrors.password = 'La contraseña debe tener mínimo 8 caracteres';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form.email, form.password]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const loggedUser = await login(form.email.trim(), form.password, form.remember);
      const roleHome = (u) => ((u?.role || '').toUpperCase() === 'AGENTE' ? '/chat' : '/status');
      const redirectTo = location.state?.from?.pathname || roleHome(loggedUser);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err?.message || 'No se pudo iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="" subtitle="">
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        {reason && <Alert severity="warning">{reason}</Alert>}
        {serverError && <Alert severity="error">{serverError}</Alert>}
        <TextField
          label="Correo corporativo"
          placeholder="usuario@whatssuite.com"
          fullWidth
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          onBlur={validate}
          error={Boolean(errors.email)}
          helperText={errors.email}
          autoComplete="email"
          autoFocus
        />
        <TextField
          label="Contraseña"
          type="password"
          fullWidth
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          onBlur={validate}
          error={Boolean(errors.password)}
          helperText={errors.password}
          autoComplete="current-password"
        />
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <FormControlLabel
            control={<Checkbox checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} />}
            label={<Typography variant="body2" color="text.secondary">Recordar sesión en este equipo</Typography>}
          />
        </Stack>
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={<LoginIcon />}
          disabled={submitting}
          sx={{ py: 1.2, textTransform: 'none', fontWeight: 700 }}
        >
          {submitting ? 'Verificando...' : 'Ingresar con email'}
        </Button>
      </Stack>
    </AuthLayout>
  );
};

export default Login;
