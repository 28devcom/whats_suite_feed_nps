import { Box, Chip, CircularProgress, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';

const QuickReplySuggestions = ({ open, query, suggestions = [], loading = false, onSelect }) => {
  if (!open && !loading) return null;
  const hasResults = Array.isArray(suggestions) && suggestions.length > 0;

  return (
    <Paper
      elevation={6}
      sx={(theme) => ({
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        mb: 1,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[6],
        maxHeight: 280,
        overflowY: 'auto',
        zIndex: 3
      })}
    >
      {loading ? (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.25 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Buscando {query ? `"${query}"` : 'respuestas rápidas'}
          </Typography>
        </Stack>
      ) : hasResults ? (
        <List dense disablePadding>
          {suggestions.map((item) => (
            <ListItemButton key={item.id} onClick={() => onSelect?.(item)}>
              <ListItemText
                primary={item.titulo}
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {item.variables?.length || 0} variables · texto controlado
                  </Typography>
                }
              />
              {!item.activo && <Chip label="Inactiva" size="small" color="warning" />}
            </ListItemButton>
          ))}
        </List>
      ) : (
        <Box sx={{ p: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Sin coincidencias para {query ? `"${query}"` : 'esta búsqueda'}.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default QuickReplySuggestions;
