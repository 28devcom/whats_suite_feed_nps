import { useCallback, useMemo, useState } from 'react';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import DeleteIcon from '@mui/icons-material/Delete';

const UserActionsMenu = ({
  user,
  onEdit,
  onToggleStatus,
  onDelete,
  disabled = false,
  canDelete = true,
  canToggle = true
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = useCallback(
    (e) => setAnchorEl(e.currentTarget),
    []
  );

  const handleClose = useCallback(
    () => setAnchorEl(null),
    []
  );

  const isActive = user?.status === 'ACTIVE';

  const toggleConfig = useMemo(() => ({
    label: isActive ? 'Desactivar' : 'Activar',
    color: isActive ? 'warning' : 'success'
  }), [isActive]);

  const handleAction = (cb) => () => {
    handleClose();
    cb?.(user);
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label="Acciones de usuario"
        aria-haspopup="menu"
        onClick={handleOpen}
        disabled={disabled}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {onEdit && (
          <MenuItem
            onClick={handleAction(onEdit)}
            aria-label="Editar usuario"
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Editar" />
          </MenuItem>
        )}

        {onToggleStatus && canToggle && (
          <MenuItem
            onClick={handleAction(onToggleStatus)}
            aria-label={toggleConfig.label}
          >
            <ListItemIcon>
              <PowerSettingsNewIcon
                fontSize="small"
                color={toggleConfig.color}
              />
            </ListItemIcon>
            <ListItemText primary={toggleConfig.label} />
          </MenuItem>
        )}

        {onDelete && canDelete && (
          <>
            <Divider />
            <MenuItem
              onClick={handleAction(onDelete)}
              aria-label="Eliminar usuario"
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Eliminar"
                primaryTypographyProps={{ color: 'error.main' }}
              />
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default UserActionsMenu;
