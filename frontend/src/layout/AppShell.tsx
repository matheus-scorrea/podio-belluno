import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined'
import FlagIcon from '@mui/icons-material/FlagOutlined'
import CorporateFareIcon from '@mui/icons-material/CorporateFareOutlined'
import GroupIcon from '@mui/icons-material/GroupOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useEffect, useState, type ReactNode } from 'react'
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LancamentoDrawer } from '../components/LancamentoDrawer'
import { APP_NAME } from '../lib/brand'

const navConta = {
  to: '/conta',
  label: 'Minha conta',
  icon: <PersonOutlinedIcon fontSize="small" />,
  match: (p: string) => p.startsWith('/conta'),
}

const navDirecao = [
  { to: '/', label: 'Painel', icon: <DashboardIcon fontSize="small" />, match: (p: string) => p === '/' },
  { to: '/metas', label: 'Metas', icon: <FlagIcon fontSize="small" />, match: (p: string) => p.startsWith('/metas') },
  { to: '/departamentos', label: 'Setores', icon: <CorporateFareIcon fontSize="small" />, match: (p: string) => p.startsWith('/departamentos') },
  { to: '/usuarios', label: 'Usuários', icon: <GroupIcon fontSize="small" />, match: (p: string) => p.startsWith('/usuarios') },
  { to: '/fechamento', label: 'Fechamento', icon: <PaymentsOutlinedIcon fontSize="small" />, match: (p: string) => p.startsWith('/fechamento') },
  navConta,
]

const navEquipe = [
  { to: '/', label: 'Painel', icon: <DashboardIcon fontSize="small" />, match: (p: string) => p === '/' },
  { to: '/fechamento', label: 'Fechamento', icon: <PaymentsOutlinedIcon fontSize="small" />, match: (p: string) => p.startsWith('/fechamento') },
  navConta,
]

type Props = {
  children: ReactNode
  ano: number
  mes: number
}

function AppNameLink({ onDark = false }: { onDark?: boolean }) {
  return (
    <Stack
      component={RouterLink}
      to="/"
      sx={{ alignItems: 'center', textDecoration: 'none', mr: { md: 1 }, flexShrink: 0 }}
    >
      <Typography
        sx={{
          fontWeight: 800,
          color: onDark ? '#fff' : 'text.primary',
          fontSize: { xs: 16, md: 18 },
          letterSpacing: 0.1,
          whiteSpace: 'nowrap',
        }}
      >
        {APP_NAME}
      </Typography>
    </Stack>
  )
}

export function AppShell({ children, ano, mes }: Props) {
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true })
  const [navOpen, setNavOpen] = useState(false)
  const [lancamentoOpen, setLancamentoOpen] = useState(false)

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (isDesktop) {
      setNavOpen(false)
    }
  }, [isDesktop])

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const links = user.is_direcao ? navDirecao : navEquipe

  async function handleLogout() {
    setNavOpen(false)
    await logout()
    navigate('/login')
  }

  const navItems = links.map((l) => {
    const active = l.match(location.pathname)
    return (
      <Button
        key={l.to}
        component={RouterLink}
        to={l.to}
        startIcon={l.icon}
        sx={{
          color: active ? '#00A8E8' : 'rgba(255,255,255,0.72)',
          fontWeight: active ? 700 : 500,
          bgcolor: active ? 'rgba(0,168,232,0.12)' : 'transparent',
          px: 1.5,
          minHeight: 36,
          flexShrink: 0,
          '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
        }}
      >
        {l.label}
      </Button>
    )
  })

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 64, md: 68 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
          <IconButton
            color="inherit"
            onClick={() => setNavOpen(true)}
            aria-label="Abrir menu"
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuOutlinedIcon />
          </IconButton>
          <AppNameLink onDark />
          <Stack direction="row" spacing={0.25} sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, py: 0.5, ml: 1 }}>
            {navItems}
          </Stack>
          <Box sx={{ flex: { xs: 1, md: 0 } }} />
          <Tooltip title="Registrar resultado">
            <Button
              variant="contained"
              onClick={() => setLancamentoOpen(true)}
              sx={{ display: { xs: 'inline-flex', md: 'none' }, minWidth: 40, px: 1 }}
              aria-label="Registrar resultado"
            >
              <TrendingUpOutlinedIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<TrendingUpOutlinedIcon />}
            onClick={() => setLancamentoOpen(true)}
            sx={{ display: { xs: 'none', md: 'inline-flex' }, whiteSpace: 'nowrap' }}
          >
            Registrar resultado
          </Button>
          <Stack direction="row" spacing={{ xs: 0.75, md: 1.25 }} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Stack
              component={RouterLink}
              to="/conta"
              direction="row"
              spacing={{ xs: 0.75, md: 1.25 }}
              sx={{ alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
            >
              <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff', lineHeight: 1.2, fontSize: 13 }}>
                  {user.name}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 1.2, mt: 0.15 }}>
                  {user.perfil_label}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#00A8E8', color: '#0A1128', width: 34, height: 34, fontWeight: 700, fontSize: 14 }}>
                {user.name.slice(0, 1)}
              </Avatar>
            </Stack>
            <Tooltip title="Sair">
              <IconButton color="inherit" onClick={() => void handleLogout()} aria-label="Sair" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={navOpen}
        onClose={() => setNavOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 'min(320px, 86vw)', sm: 320 },
              bgcolor: '#0A1128',
              color: '#fff',
              border: 'none',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.75 }}>
          <AppNameLink onDark />
          <IconButton color="inherit" onClick={() => setNavOpen(false)} aria-label="Fechar menu">
            <CloseOutlinedIcon />
          </IconButton>
        </Stack>
        <Box sx={{ px: 2, pb: 2, display: { xs: 'block', sm: 'none' } }}>
          <Stack
            component={RouterLink}
            to="/conta"
            direction="row"
            spacing={1.5}
            onClick={() => setNavOpen(false)}
            sx={{ alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
          >
            <Avatar sx={{ bgcolor: '#00A8E8', color: '#0A1128', width: 40, height: 40, fontWeight: 700 }}>
              {user.name.slice(0, 1)}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>
                {user.name}
              </Typography>
              <Chip size="small" label={user.perfil_label} sx={{ bgcolor: '#1C2541', color: '#00A8E8', height: 22, mt: 0.4 }} />
            </Box>
          </Stack>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <List sx={{ px: 1, py: 1.5, flex: 1 }}>
          {links.map((l) => {
            const active = l.match(location.pathname)
            return (
              <ListItemButton
                key={l.to}
                component={RouterLink}
                to={l.to}
                selected={active}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  color: active ? '#00A8E8' : 'rgba(255,255,255,0.82)',
                  '&.Mui-selected': { bgcolor: 'rgba(0,168,232,0.12)' },
                  '&.Mui-selected:hover': { bgcolor: 'rgba(0,168,232,0.18)' },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{l.icon}</ListItemIcon>
                <ListItemText primary={l.label} slotProps={{ primary: { sx: { fontWeight: active ? 700 : 500 } } }} />
              </ListItemButton>
            )
          })}
        </List>
        <Box sx={{ mt: 'auto', p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<TrendingUpOutlinedIcon />}
            onClick={() => {
              setNavOpen(false)
              setLancamentoOpen(true)
            }}
            sx={{ mb: 1.5 }}
          >
            Registrar resultado
          </Button>
          <Button fullWidth color="inherit" startIcon={<LogoutIcon />} onClick={() => void handleLogout()}>
            Sair
          </Button>
        </Box>
      </Drawer>

      <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 2, md: 3 } }}>
        {children}
      </Container>
      <LancamentoDrawer open={lancamentoOpen} onClose={() => setLancamentoOpen(false)} ano={ano} mes={mes} />
    </Box>
  )
}
