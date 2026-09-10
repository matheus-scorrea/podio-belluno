import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { APP_NAME, APP_TAGLINE } from '../lib/brand'

export function LoginPage() {
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = `Entrar · ${APP_NAME}`
    return () => {
      document.title = APP_NAME
    }
  }, [])

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 419) {
        setError('Sessão expirada. Recarregue a página e tente de novo.')
      } else if (status === 429) {
        setError('Muitas tentativas. Aguarde um minuto e tente de novo.')
      } else if (status === 422) {
        setError('E-mail ou senha inválidos.')
      } else {
        setError('Não foi possível entrar. Tente novamente em instantes.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background: 'linear-gradient(165deg, #0A1128 0%, #13233F 48%, #0A1128 100%)',
      }}
    >
      <Paper sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 }, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
        <Stack spacing={0.75} sx={{ mb: 3.5, alignItems: 'flex-start' }}>
          <Typography variant="h5">
            {APP_NAME}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {APP_TAGLINE}
          </Typography>
        </Stack>
        <form onSubmit={(e) => void onSubmit(e)}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="E-mail corporativo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              autoComplete="email"
              autoFocus
            />
            <TextField
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              autoComplete="current-password"
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
