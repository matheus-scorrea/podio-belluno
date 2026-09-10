import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { AppShell } from '../layout/AppShell'
import { cargosDoSetor, departamentosParaSelect } from '../lib/organizacao'
import { SENHA_REQUISITOS, senhaAtendeRegras } from '../lib/senha'
import type { AuthUser, Departamento } from '../types'

export function UsuarioFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isDirecao, setIsDirecao] = useState(false)
  const [ativo, setAtivo] = useState(true)
  const [departamentoId, setDepartamentoId] = useState<number | ''>('')
  const [cargoId, setCargoId] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(!isEdit)

  const { data: usuario, isLoading } = useQuery({
    queryKey: ['usuario', id],
    queryFn: async () => (await api.get(`/usuarios/${id}`)).data.data as AuthUser,
    enabled: isEdit,
  })
  const { data: departamentos } = useQuery({
    queryKey: ['departamentos'],
    queryFn: async () => (await api.get('/departamentos')).data as Departamento[],
  })
  const cargos = cargosDoSetor(departamentos, departamentoId, cargoId === '' ? null : cargoId)
  const setores = departamentosParaSelect(departamentos, departamentoId === '' ? null : departamentoId)

  useEffect(() => {
    if (!usuario) {
      return
    }
    setName(usuario.name)
    setEmail(usuario.email)
    setPassword('')
    setPasswordConfirmation('')
    setIsDirecao(usuario.is_direcao)
    setAtivo(usuario.ativo)
    setDepartamentoId(usuario.departamento_id ?? '')
    setCargoId(usuario.cargo_id ?? '')
    setHydrated(true)
  }, [usuario])

  const senhaInformada = password.length > 0
  const senhaValida = senhaAtendeRegras(password) && password === passwordConfirmation
  const podeSalvar =
    Boolean(name && email) &&
    (isEdit ? !senhaInformada || senhaValida : senhaValida) &&
    (isDirecao || (Boolean(departamentoId) && Boolean(cargoId)))

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name,
        email,
        is_direcao: isDirecao,
        ativo,
        departamento_id: isDirecao ? null : departamentoId || null,
        cargo_id: isDirecao ? null : cargoId || null,
      }
      if (password) {
        payload.password = password
        payload.password_confirmation = passwordConfirmation
      }
      if (isEdit && id) {
        await api.put(`/usuarios/${id}`, payload)
        return
      }
      await api.post('/usuarios', payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
        queryClient.invalidateQueries({ queryKey: ['usuario'] }),
      ])
      navigate('/usuarios')
    },
    onError: () => setError('Não foi possível salvar o usuário. Verifique os campos obrigatórios.'),
  })

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell ano={2026} mes={9}>
      <PageHeader
        title={isEdit ? 'Editar usuário' : 'Novo usuário'}
        subtitle={isEdit ? 'Atualize perfil, setor e acesso desta pessoa.' : 'Cadastre direção, líderes e colaboradores.'}
        backTo={{ href: '/usuarios', label: 'Voltar para usuários' }}
      />
      <Paper sx={{ p: { xs: 2, md: 3.5 } }}>
        {isEdit && (!hydrated || isLoading) ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Stack spacing={2.5} sx={{ maxWidth: 640 }}>
              <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <TextField
                label={isEdit ? 'Nova senha' : 'Senha'}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEdit}
                autoComplete="new-password"
                helperText={isEdit ? `Deixe em branco para manter a senha atual. ${SENHA_REQUISITOS}` : SENHA_REQUISITOS}
              />
              {(!isEdit || senhaInformada) && (
                <TextField
                  label="Confirmar senha"
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required={!isEdit || senhaInformada}
                  autoComplete="new-password"
                  error={passwordConfirmation.length > 0 && password !== passwordConfirmation}
                  helperText={
                    passwordConfirmation.length > 0 && password !== passwordConfirmation
                      ? 'As senhas não coincidem.'
                      : undefined
                  }
                />
              )}
              <FormControlLabel
                control={<Checkbox checked={isDirecao} onChange={(e) => setIsDirecao(e.target.checked)} />}
                label="Direção"
              />
              {isEdit && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={ativo}
                      onChange={(e) => setAtivo(e.target.checked)}
                      disabled={Boolean(id) && Number(id) === user?.id}
                    />
                  }
                  label="Usuário ativo"
                />
              )}
              {!isDirecao && (
                <>
                  <FormControl>
                    <InputLabel>Setor</InputLabel>
                    <Select
                      label="Setor"
                      value={departamentoId}
                      onChange={(e) => {
                        const value: unknown = e.target.value
                        setDepartamentoId(value === '' ? '' : Number(value))
                        setCargoId('')
                      }}
                    >
                      <MenuItem value="" disabled>
                        Selecione
                      </MenuItem>
                      {(setores ?? []).map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <InputLabel>Cargo</InputLabel>
                    <Select
                      label="Cargo"
                      value={cargoId}
                      disabled={!departamentoId}
                      onChange={(e) => {
                        const value: unknown = e.target.value
                        setCargoId(value === '' ? '' : Number(value))
                      }}
                    >
                      <MenuItem value="" disabled>
                        Selecione
                      </MenuItem>
                      {cargos.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.nome}
                          {!c.ativo ? ' (inativo)' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )}
            </Stack>
            {error && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}
            <Divider sx={{ mt: 4, mb: 2.5 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/usuarios')}>
                Voltar para usuários
              </Button>
              <Button variant="contained" onClick={() => mutation.mutate()} disabled={!podeSalvar || mutation.isPending}>
                {isEdit ? 'Salvar alterações' : 'Cadastrar usuário'}
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </AppShell>
  )
}
