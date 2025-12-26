import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';

import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import DeleteIcon from '@mui/icons-material/Delete';

import UserStatusBadge from './UserStatusBadge.jsx';
import EmptyState from '../ui/EmptyState.jsx';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
};

const UsersTable = ({
  users = [],
  loading = false,
  onRefresh,
  onEdit,
  onToggleStatus,
  onDelete,
  canEdit = false,
  canToggle = false,
  canDelete = false
}) => {
  /* ===================== EMPTY ===================== */
  if (!loading && users.length === 0) {
    return (
      <EmptyState
        title="Sin usuarios"
        description="Crea tu primer usuario para comenzar."
      />
    );
  }

  return (
    <Paper
      sx={(theme) => ({
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.semanticColors.surface,
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: `0 8px 24px ${theme.palette.action.hover}`
      })}
      aria-busy={loading}
    >
      {/* ===================== HEADER ===================== */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        py={1.5}
        sx={{
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Usuarios
        </Typography>

        <Tooltip title="Refrescar" arrow>
          <span>
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Refrescar usuarios"
            >
              {loading ? (
                <CircularProgress size={18} />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* ===================== TABLE ===================== */}
      <TableContainer>
        <Table size="small" aria-label="Tabla de usuarios">
          <TableHead>
            <TableRow
              sx={(theme) => ({
                backgroundColor: theme.palette.action.hover,
                '& th': {
                  color: theme.palette.text.secondary,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: 12,
                  letterSpacing: 0.4,
                  borderBottom: `1px solid ${theme.palette.divider}`
                }
              })}
            >
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Creado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {users.map((u) => {
              const isActive = u.status === 'ACTIVE';

              return (
                <TableRow
                  key={u.id}
                  hover
                  sx={(theme) => ({
                    backgroundColor: theme.palette.background.paper,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    },
                    '& td': {
                      borderBottom: `1px solid ${theme.palette.divider}`
                    }
                  })}
                >
                  <TableCell>{u.name || '—'}</TableCell>
                  <TableCell>{u.email || '—'}</TableCell>
                  <TableCell>{u.role || '—'}</TableCell>

                  <TableCell>
                    <UserStatusBadge status={u.status} />
                  </TableCell>

                  <TableCell>
                    {formatDate(u.createdAt)}
                  </TableCell>

                  <TableCell align="right">
                    <Box
                      sx={{
                        display: 'inline-flex',
                        gap: 0.5
                      }}
                    >
                      {canEdit && (
                        <Tooltip title="Editar" arrow>
                          <span>
                            <IconButton
                              size="small"
                              aria-label="Editar usuario"
                              onClick={() => onEdit?.(u)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}

                      {canToggle && (
                        <Tooltip
                          title={isActive ? 'Desactivar' : 'Activar'}
                          arrow
                        >
                          <span>
                            <IconButton
                              size="small"
                              aria-label={
                                isActive
                                  ? 'Desactivar usuario'
                                  : 'Activar usuario'
                              }
                              color={isActive ? 'warning' : 'success'}
                              onClick={() => onToggleStatus?.(u)}
                            >
                              <PowerSettingsNewIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}

                      {canDelete && (
                        <Tooltip title="Eliminar" arrow>
                          <span>
                            <IconButton
                              size="small"
                              aria-label="Eliminar usuario"
                              color="error"
                              onClick={() => onDelete?.(u)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default UsersTable;
