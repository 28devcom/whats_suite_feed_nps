import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Header = ({ sidebarOpen, onOpenSidebar, connectionStatus = 'connected' }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    await logout();
    handleMenuClose();
  };

  const title = location.pathname.replace('/', '') || 'Dashboard';

  const statusColor = connectionStatus === 'connected' ? 'success' : connectionStatus === 'error' ? 'error' : 'warning';

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={(theme) => ({
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.semanticColors.surface,
        boxShadow: `0 10px 32px ${theme.palette.mode === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(0,0,0,0.35)'}`
      })}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: 68 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {!sidebarOpen && (
            <IconButton edge="start" onClick={onOpenSidebar}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="subtitle1" fontWeight={800}>
            WhatsSuite
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 1, opacity: 0.2 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
            {title}
          </Typography>
          <Chip
            size="small"
            icon={<SignalCellularAltIcon />}
            label={connectionStatus}
            color={statusColor}
            variant="outlined"
          />
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box textAlign="right">
            <Typography variant="body2" fontWeight={700}>
              {user?.fullName || user?.email}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role}
            </Typography>
          </Box>
          <IconButton onClick={handleMenuOpen} size="small">
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              {user?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose} keepMounted>
            <MenuItem disabled>Rol: {user?.role}</MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <PowerSettingsNewIcon fontSize="small" style={{ marginRight: 8 }} /> Cerrar sesión
            </MenuItem>
          </Menu>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
