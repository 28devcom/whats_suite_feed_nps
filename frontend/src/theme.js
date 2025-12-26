import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

// Tokens semánticos para la identidad clara/premium y soporte futuro de dark mode.
const semanticTokens = {
  light: {
    background: '#F7F9FC',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F4F9',
    surfaceHover: '#E0E7FF',
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    border: '#E3E8EF'
  },
  dark: {
    background: '#0B1220',
    surface: '#0F172A',
    surfaceSecondary: '#111827',
    surfaceHover: '#1F2937',
    primary: '#2563EB',
    primaryHover: '#1E40AF',
    textPrimary: '#E5E7EB',
    textSecondary: '#94A3B8',
    border: '#1F2937'
  }
};

const commonTypography = {
  fontFamily: '"Inter", "IBM Plex Sans", "Segoe UI", "Helvetica Neue", sans-serif',
  fontSize: 13.5,
  h1: { fontWeight: 700, letterSpacing: -0.5, fontSize: '18px', lineHeight: 1.2 },
  h2: { fontWeight: 650, letterSpacing: -0.4, fontSize: '16px', lineHeight: 1.2 },
  h3: { fontWeight: 650, letterSpacing: -0.3, fontSize: '14px', lineHeight: 1.18 },
  h4: { fontWeight: 600, letterSpacing: -0.2, fontSize: '13px' },
  h5: { fontWeight: 600, letterSpacing: -0.1, fontSize: '12.5px' },
  subtitle1: { fontWeight: 600, fontSize: '13px', letterSpacing: -0.05 },
  subtitle2: { fontWeight: 600, fontSize: '12.5px', letterSpacing: -0.05 },
  body1: { lineHeight: 1.5, fontSize: '13.5px' },
  body2: { lineHeight: 1.45, fontSize: '13px' },
  caption: { fontSize: '12px' }
};

const shape = { borderRadius: 12 };

const createComponents = (mode) => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: ({ theme }) => ({
        backgroundColor: theme.semanticColors.background,
        color: theme.semanticColors.textPrimary,
        backgroundImage:
          mode === 'light'
            ? `
                radial-gradient(circle at 12% 20%, rgba(37,99,235,0.05), transparent 25%),
                radial-gradient(circle at 85% 12%, rgba(37,99,235,0.06), transparent 30%),
                linear-gradient(145deg, rgba(37,99,235,0.04), rgba(255,255,255,0.9))
              `
            : `
                radial-gradient(circle at 15% 20%, rgba(37,99,235,0.18), transparent 28%),
                radial-gradient(circle at 78% 8%, rgba(37,99,235,0.16), transparent 32%),
                linear-gradient(160deg, rgba(15,23,42,0.92), rgba(15,23,42,0.86))
              `
      })
    }
  },
  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, mode === 'light' ? 0.06 : 0.16)}`,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        backgroundImage: 'none',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, mode === 'light' ? 0.1 : 0.22)}`
        }
      })
    }
  },
  MuiButton: {
    defaultProps: { disableElevation: true, variant: 'contained' },
    styleOverrides: {
      root: ({ theme }) => ({
        textTransform: 'none',
        fontWeight: 700,
        borderRadius: 10,
        paddingInline: 16,
        boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.12)}`,
        '&:hover': {
          boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, 0.16)}`
        }
      }),
      containedPrimary: ({ theme }) => ({
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:hover': {
          backgroundColor: theme.palette.primary.dark
        }
      }),
      containedSecondary: ({ theme }) => ({
        backgroundColor: theme.semanticColors.surfaceSecondary,
        color: theme.palette.text.primary,
        '&:hover': {
          backgroundColor: theme.semanticColors.surfaceHover
        }
      }),
      containedError: ({ theme }) => ({
        backgroundColor: theme.palette.error.main,
        color: theme.palette.common.white,
        '&:hover': { backgroundColor: theme.palette.error.dark }
      }),
      containedWarning: ({ theme }) => ({
        backgroundColor: theme.palette.warning.main,
        color: theme.palette.common.white,
        '&:hover': { backgroundColor: theme.palette.warning.dark }
      })
    }
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundImage: 'none',
        borderColor: theme.palette.divider,
        borderRadius: 14
      })
    }
  },
  MuiTableContainer: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 14,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.semanticColors.surface,
        boxShadow: `0 10px 28px ${alpha(theme.palette.primary.main, mode === 'light' ? 0.06 : 0.18)}`,
        overflow: 'hidden'
      })
    }
  },
  MuiTableHead: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.semanticColors.surfaceSecondary,
        '& th': {
          textTransform: 'uppercase',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: 0.4,
          borderBottom: `1px solid ${theme.palette.divider}`
        }
      })
    }
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 10, fontWeight: 600 }
    }
  },
  MuiTextField: {
    defaultProps: { size: 'small', variant: 'outlined' }
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.semanticColors.surface,
        borderRadius: 10,
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.divider
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: alpha(theme.palette.primary.main, 0.7)
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`
        },
        '&.Mui-error .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.error.main
        },
        '&.Mui-disabled': {
          backgroundColor: theme.palette.action.hover
        }
      })
    }
  },
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 10,
        '&.Mui-selected': {
          backgroundColor: alpha(theme.palette.primary.main, 0.12),
          color: theme.semanticColors.textPrimary
        }
      })
    }
  }
});

const createAppTheme = (mode = 'light') => {
  const tokens = semanticTokens[mode];
  const theme = createTheme({
    palette: {
      mode,
      primary: { main: tokens.primary, dark: tokens.primaryHover, light: '#4E8DF5', contrastText: '#FFFFFF' },
      secondary: { main: '#1E40AF', dark: '#1C3A93', light: '#4B64C6', contrastText: '#FFFFFF' },
      success: { main: '#16A34A', dark: '#15803D' },
      warning: { main: '#F59E0B', dark: '#D97706' },
      error: { main: '#DC2626', dark: '#B91C1C' },
      info: { main: tokens.primary, dark: tokens.primaryHover },
      background: { default: tokens.background, paper: tokens.surface },
      text: { primary: tokens.textPrimary, secondary: tokens.textSecondary },
      divider: tokens.border,
      action: {
        hover: tokens.surfaceHover,
        selectedOpacity: 0.12,
        hoverOpacity: 0.08,
        focusOpacity: 0.12
      }
    },
    typography: commonTypography,
    shape,
    components: createComponents(mode),
    semanticColors: tokens
  });

  return responsiveFontSizes(theme);
};

export const themes = {
  light: createAppTheme('light'),
  dark: createAppTheme('dark')
};

const defaultTheme = themes.light;
export default defaultTheme;
