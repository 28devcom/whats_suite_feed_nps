import { useEffect, useMemo } from 'react';
import { Avatar, Box, Divider, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography, Stack, Button } from '@mui/material';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { navigationSections, filterSectionsByRole } from '../config/navigation.config.js';
import { alpha } from '@mui/material/styles';

const storageKey = 'whatssuite-sidebar-open';

const Sidebar = ({ open, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(open));
  }, [open]);

  const currentPath = location.pathname;

  const sections = useMemo(
    () => filterSectionsByRole(navigationSections, user?.role),
    [user?.role]
  );

  const renderItem = (item) => {
    const active = currentPath.startsWith(item.path);
    const Icon = item.icon;
    const content = (
      <ListItemButton
        key={item.label}
        component={NavLink}
        to={item.path}
        selected={active}
        sx={(theme) => ({
          position: 'relative',
          borderRadius: 2,
          mb: 0.5,
          mx: 1,
          alignItems: 'center',
          gap: 1,
          color: theme.palette.text.secondary,
          transition: 'background-color 160ms ease, color 160ms ease, padding-left 160ms ease',
          pl: open ? 2 : 1.5,
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 8,
            bottom: 8,
            width: active ? 3 : 0,
            borderRadius: 6,
            backgroundColor: theme.palette.primary.main,
            transition: 'width 160ms ease'
          },
          '&:hover': {
            bgcolor: theme.semanticColors.surfaceHover,
            color: theme.palette.text.primary
          },
          '&.Mui-selected': {
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            color: theme.palette.text.primary,
            '&::before': { width: 3 }
          }
        })}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
          <Icon />
        </ListItemIcon>
        {open && <ListItemText primary={item.label} />}
      </ListItemButton>
    );
    if (open) return content;
    return (
      <Tooltip key={item.label} title={item.label} placement="right">
        <Box>{content}</Box>
      </Tooltip>
    );
  };

  return (
    <Box
      sx={(theme) => ({
        width: open ? 260 : 88, // Debe coincidir con Layout para evitar solapamientos
        transition: 'width 0.25s ease',
        bgcolor: theme.semanticColors.surfaceSecondary,
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        borderRight: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // sidebar no se ve afectado por el scroll del contenido
        zIndex: theme.zIndex.drawer,
        boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, theme.palette.mode === 'light' ? 0.05 : 0.18)}`
      })}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={open ? 'space-between' : 'center'}
        sx={(theme) => ({ p: 2, gap: 1, borderBottom: `1px solid ${theme.palette.divider}` })}
      >
        {open && (
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={800} color="inherit">
              WhatsSuite
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Stack>
        )}
        <IconButton size="small" onClick={onToggle}>
          {open ? <MenuOpenIcon /> : <MenuIcon />}
        </IconButton>
      </Stack>
      <Divider />
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', mt: 1 }}>
        <List disablePadding>
          {sections.map((section) => (
            <Box key={section.title} sx={{ mb: 1 }}>
              {open ? (
                <Typography variant="caption" sx={{ px: 2, py: 0.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {section.title}
                </Typography>
              ) : (
                <Divider sx={{ my: 1 }} />
              )}
              {section.items.map((item) => renderItem(item))}
            </Box>
          ))}
        </List>
      </Box>
      <Divider />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2, bgcolor: 'inherit' }}>
        <Avatar
          sx={(theme) => ({
            width: 32,
            height: 32,
            bgcolor: theme.semanticColors.surfaceHover,
            color: theme.palette.primary.dark,
            transition: 'transform 160ms ease'
          })}
        >
          {user?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
        </Avatar>
        {open && (
          <Stack spacing={0}>
            <Typography variant="body2" fontWeight={700} color="inherit">
              {user?.fullName || 'Usuario'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role || 'AGENTE'}
            </Typography>
            <Button variant="text" color="inherit" size="small" onClick={() => logout()} startIcon={<LogoutIcon fontSize="small" />}>
              Cerrar sesión
            </Button>
          </Stack>
        )}
        {!open && (
          <Tooltip title="Cerrar sesión" placement="right">
            <IconButton size="small" onClick={() => logout()}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
};

export default Sidebar;
