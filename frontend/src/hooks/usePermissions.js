import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const normalizeRoles = (roles) => {
  if (!roles) return [];
  return Array.isArray(roles) ? roles : [roles];
};

// Hook de permisos en cliente. No sustituye al backend, pero permite ocultar acciones y rutas sin duplicar lógica.
const usePermissions = () => {
  const { user } = useAuth();
  const role = user?.role;

  const hasRole = (roles) => {
    const required = normalizeRoles(roles);
    if (!required.length) return true;
    return required.includes(role);
  };

  const can = useMemo(
    () => ({
      access: (roles) => hasRole(roles),
      any: (roles) => hasRole(roles)
    }),
    [role]
  );

  return { role, hasRole, can };
};

export default usePermissions;
