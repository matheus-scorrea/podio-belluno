import { createTheme } from '@mui/material/styles'
import { ptBR } from '@mui/material/locale'

const navy = '#0A1128'
const navySoft = '#1C2541'
const cyan = '#00A8E8'
const cyanDark = '#0077B6'
const line = '#E6EAF0'

export const appTheme = createTheme(
  {
    palette: {
      primary: { main: cyan, dark: cyanDark, contrastText: '#FFFFFF' },
      secondary: { main: navy, dark: navySoft, contrastText: '#FFFFFF' },
      success: { main: '#0F9F6E' },
      warning: { main: '#D97706' },
      error: { main: '#DC2626' },
      background: { default: '#F4F6F8', paper: '#FFFFFF' },
      divider: line,
      text: { primary: navy, secondary: '#5B677A' },
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      h4: { fontWeight: 700, letterSpacing: -0.4 },
      h5: { fontWeight: 700, letterSpacing: -0.3 },
      h6: { fontWeight: 600, letterSpacing: -0.2 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
      overline: { fontWeight: 600, letterSpacing: 0.9 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: '#F4F6F8' },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: '0 1px 2px rgba(10, 17, 40, 0.04)',
            border: `1px solid ${line}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: navy,
            boxShadow: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8 },
          contained: { boxShadow: 'none' },
          outlined: { borderColor: line },
          sizeLarge: { paddingInline: 20, minHeight: 44 },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderColor: line },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 14, boxShadow: '0 16px 40px rgba(10, 17, 40, 0.12)' },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: { padding: '12px 24px 20px' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: '#EEF1F5' },
          head: {
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.35,
            textTransform: 'uppercase',
            color: '#5B677A',
            backgroundColor: '#F8FAFC',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              color: '#5B677A',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
          outlined: { borderColor: line },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: navy, fontSize: 12, fontWeight: 500 },
        },
      },
    },
  },
  ptBR,
)
