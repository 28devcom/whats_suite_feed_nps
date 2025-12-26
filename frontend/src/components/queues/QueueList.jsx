import { alpha } from '@mui/material/styles';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import GroupIcon from '@mui/icons-material/Group';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';

import EmptyState from '../ui/EmptyState.jsx';

const QueueList = ({
  queues = [],
  onEdit,
  onDelete,
  onManageUsers,
  onManageWhatsApps
}) => {
  if (!queues.length) {
    return (
      <EmptyState
        title="Sin colas"
        description="Crea la primera cola para comenzar a asignar chats."
      />
    );
  }

  return (
    <Stack spacing={2}>
      {queues.map((q) => {
        const isActive = q.active !== false;

        return (
          <Card
            key={q.id}
            sx={(theme) => ({
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              backgroundColor: theme.semanticColors.surface,
              boxShadow: `0 12px 28px ${alpha(theme.palette.common.black, 0.06)}`,
              transition: 'all 180ms ease',
              '&:hover': {
                boxShadow: `0 18px 40px ${alpha(theme.palette.common.black, 0.1)}`
              }
            })}
          >
            <CardContent>
              <Stack spacing={1.25}>
                {/* ===================== HEADER ===================== */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={1}
                >
                  <Box>
                    <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                      {q.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ maxWidth: 520 }}
                    >
                      {q.description || 'Sin descripción'}
                    </Typography>
                  </Box>

                  <Chip
                    label={isActive ? 'Activa' : 'Inactiva'}
                    color={isActive ? 'success' : 'default'}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>

                <Divider />

                {/* ===================== ACTIONS ===================== */}
                <Stack
                  direction="row"
                  spacing={0.5}
                  justifyContent="flex-end"
                  flexWrap="wrap"
                >
                  <Tooltip title="Gestionar usuarios" arrow>
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Gestionar usuarios"
                        onClick={() => onManageUsers?.(q)}
                      >
                        <GroupIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Tooltip title="Gestionar conexiones WhatsApp" arrow>
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Gestionar WhatsApps"
                        onClick={() => onManageWhatsApps?.(q)}
                      >
                        <LinkIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Tooltip title="Editar cola" arrow>
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Editar cola"
                        onClick={() => onEdit?.(q)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Tooltip title="Eliminar cola" arrow>
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Eliminar cola"
                        color="error"
                        onClick={() => onDelete?.(q)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
};

export default QueueList;
