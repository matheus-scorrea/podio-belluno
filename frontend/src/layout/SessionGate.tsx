import { Box, CircularProgress } from '@mui/material'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function SessionGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const naLogin = location.pathname === '/login'
  const noPrimeiroAcesso = location.pathname === '/primeiro-acesso'

  if (loading && !naLogin) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (user?.must_change_password && !noPrimeiroAcesso) {
    return <Navigate to="/primeiro-acesso" replace />
  }

  if (user && !user.must_change_password && noPrimeiroAcesso) {
    return <Navigate to="/" replace />
  }

  return children
}
