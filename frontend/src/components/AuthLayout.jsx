import { Box, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

const AuthLayout = ({ title, subtitle, sideContent, children }) => {
  const hasSide = Boolean(sideContent);
  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        background: `radial-gradient(circle at 20% 20%, ${alpha(theme.palette.primary.main, 0.12)} 0%, transparent 38%), linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${theme.semanticColors.background} 60%)`,
        color: 'text.primary'
      })}
    >
      <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        {hasSide ? (
          <Grid container spacing={4} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={6}>
              <Paper
                elevation={12}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  boxShadow: (theme) => `0 22px 60px ${alpha(theme.palette.primary.main, 0.12)}`
                }}
              >
                <Stack spacing={3}>
                  {(title || subtitle) && (
                    <Stack spacing={0.5}>
                      {title && (
                        <Typography variant="h4" fontWeight={700}>
                          {title}
                        </Typography>
                      )}
                      {subtitle && (
                        <Typography variant="body2" color="text.secondary">
                          {subtitle}
                        </Typography>
                      )}
                    </Stack>
                  )}
                  {children}
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              {sideContent}
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ maxWidth: 520, width: '100%' }}>
            <Paper
              elevation={12}
              sx={{
                p: 4,
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: (theme) => `1px solid ${theme.palette.divider}`,
                boxShadow: (theme) => `0 22px 60px ${alpha(theme.palette.primary.main, 0.12)}`
              }}
            >
              <Stack spacing={3}>
                {(title || subtitle) && (
                  <Stack spacing={0.5}>
                    {title && (
                      <Typography variant="h4" fontWeight={700}>
                        {title}
                      </Typography>
                    )}
                    {subtitle && (
                      <Typography variant="body2" color="text.secondary">
                        {subtitle}
                      </Typography>
                    )}
                  </Stack>
                )}
                {children}
              </Stack>
            </Paper>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default AuthLayout;
