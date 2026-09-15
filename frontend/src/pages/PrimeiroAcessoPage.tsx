import LogoutIcon from '@mui/icons-material/Logout'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ensureCsrf } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { CamposSenhaNova } from '../components/CamposSenhaNova'
import { APP_NAME } from '../lib/brand'
import { senhaAtendeRegras } from '../lib/senha'

function erroSenha(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
  return data?.errors?.password?.[0] ?? data?.message ?? 'Não foi possível salvar a senha.'
}

export function PrimeiroAcessoPage() {
  const { user, logout, refresh } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = `Criar senha · ${APP_NAME}`
    return () => {
      document.title = APP_NAME
    }
  }, [])

  const mutation = useMutation({
    mutationFn: async () => {
      await ensureCsrf()
      await api.put('/me/senha', { password, password_confirmation: confirmacao })
    },
    onSuccess: async () => {
      await refresh()
      navigate('/', { replace: true })
    },
    onError: (err) => setError(erroSenha(err)),
  })

  const podeSalvar = senhaAtendeRegras(password) && password === confirmacao

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
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
      <Paper sx={{ width: '100%', maxWidth: 460, p: { xs: 3, sm: 4 }, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
        <Stack spacing={0.75} sx={{ mb: 3 }}>
          <Typography variant="h5">Crie sua senha</Typography>
          <Typography variant="body2" color="text.secondary">
            Olá, {user?.name.split(' ')[0]}. Esta é a primeira vez que você entra. Defina uma senha só sua para continuar.
          </Typography>
        </Stack>
        <form onSubmit={(e) => void onSubmit(e)}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <CamposSenhaNova senha={password} confirmacao={confirmacao} onSenha={setPassword} onConfirmacao={setConfirmacao} />
            <Button type="submit" variant="contained" size="large" disabled={!podeSalvar || mutation.isPending}>
              {mutation.isPending ? 'Salvando…' : 'Salvar e entrar'}
            </Button>
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={() => void handleLogout()}>
              Sair
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
