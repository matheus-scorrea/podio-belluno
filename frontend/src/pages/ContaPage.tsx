import { Alert, Button, Divider, Paper, Stack, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api, ensureCsrf } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { CamposSenhaNova } from '../components/CamposSenhaNova'
import { PageHeader } from '../components/PageHeader'
import { AppShell } from '../layout/AppShell'
import { senhaAtendeRegras } from '../lib/senha'

function erroSenha(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
  return (
    data?.errors?.senha_atual?.[0] ??
    data?.errors?.password?.[0] ??
    data?.message ??
    'Não foi possível redefinir a senha.'
  )
}

export function ContaPage() {
  const { user, refresh } = useAuth()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [password, setPassword] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const mutation = useMutation({
    mutationFn: async () => {
      await ensureCsrf()
      await api.put('/me/senha', {
        senha_atual: senhaAtual,
        password,
        password_confirmation: confirmacao,
      })
    },
    onSuccess: async () => {
      setError(null)
      setOk(true)
      setSenhaAtual('')
      setPassword('')
      setConfirmacao('')
      await refresh()
    },
    onError: (err) => {
      setOk(false)
      setError(erroSenha(err))
    },
  })

  const podeSalvar = senhaAtual.length > 0 && senhaAtendeRegras(password) && password === confirmacao

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setOk(false)
    setError(null)
    mutation.mutate()
  }

  return (
    <AppShell ano={2026} mes={9}>
      <PageHeader title="Minha conta" subtitle="Seus dados de acesso. Só você redefine a sua senha por aqui." />
      <Stack spacing={3} sx={{ maxWidth: 640 }}>
        <Paper sx={{ p: { xs: 2, md: 3.5 } }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Dados
          </Typography>
          <Stack spacing={2}>
            <TextField label="Nome" value={user?.name ?? ''} slotProps={{ input: { readOnly: true } }} />
            <TextField label="E-mail" value={user?.email ?? ''} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Perfil" value={user?.perfil_label ?? ''} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Setor" value={user?.departamento?.nome ?? '—'} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Cargo" value={user?.cargo?.nome ?? '—'} slotProps={{ input: { readOnly: true } }} />
          </Stack>
        </Paper>
        <Paper sx={{ p: { xs: 2, md: 3.5 } }}>
          <Typography variant="subtitle1">Redefinir senha</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
            Informe a senha atual e escolha uma nova.
          </Typography>
          <form onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error}</Alert>}
              {ok && <Alert severity="success">Senha atualizada.</Alert>}
              <TextField
                label="Senha atual"
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
                autoComplete="current-password"
              />
              <CamposSenhaNova senha={password} confirmacao={confirmacao} onSenha={setPassword} onConfirmacao={setConfirmacao} />
              <Divider />
              <Button type="submit" variant="contained" disabled={!podeSalvar || mutation.isPending} sx={{ alignSelf: 'flex-start' }}>
                {mutation.isPending ? 'Salvando…' : 'Salvar nova senha'}
              </Button>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </AppShell>
  )
}
