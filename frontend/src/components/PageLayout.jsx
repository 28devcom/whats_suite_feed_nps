import { alpha } from '@mui/material/styles';
import { Box, Container, Stack, Typography, Divider } from '@mui/material';

// Contenedor de página unificado con superficies sólidas y jerarquía clara.
const PageLayout = ({ title, subtitle, actions, children, maxWidth = 'xl' }) => {
  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        bgcolor: theme.semanticColors.background,
        color: 'text.primary',
        px: { xs: 1, sm: 2 }
      })}
    >
      <Container maxWidth={maxWidth} sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={(theme) => ({
            backgroundColor: theme.semanticColors.surface,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
            boxShadow: `0 10px 26px ${alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.08 : 0.22)}`,
            p: { xs: 1.75, sm: 2.5 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          })}
        >
          {(title || subtitle || actions) && (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                <Stack spacing={0.4}>
                  {title && (
                    <Typography variant="h5" fontWeight={800}>
                      {title}
                    </Typography>
                  )}
                  {subtitle && (
                    <Typography variant="body2" color="text.secondary">
                      {subtitle}
                    </Typography>
                  )}
                </Stack>
                {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
              </Stack>
              <Divider />
            </>
          )}
          {children}
        </Box>
      </Container>
    </Box>
  );
};

export default PageLayout;
