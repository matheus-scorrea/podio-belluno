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
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { AppShell } from '../layout/AppShell'
import { competenciaVigente } from '../lib/labels'
import type { DwConexao } from '../types'

function erroApi(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
  return (
    data?.errors?.conexao?.[0] ??
    data?.errors?.host?.[0] ??
    data?.errors?.senha?.[0] ??
    data?.message ??
    'Não foi possível salvar a conexão.'
  )
}

export function ConexaoFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const vigente = competenciaVigente()

  const [nome, setNome] = useState('')
  const [driver, setDriver] = useState('mysql')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('3306')
  const [database, setDatabase] = useState('')
  const [username, setUsername] = useState('')
  const [senha, setSenha] = useState('')
  const [ssl, setSsl] = useState(false)
  const [temSenha, setTemSenha] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(!isEdit)

  const { data, isLoading } = useQuery({
    queryKey: ['conexao', id],
    queryFn: async () => (await api.get(`/conexoes/${id}`)).data as DwConexao,
    enabled: isEdit,
  })

  useEffect(() => {
    if (!data) {
      return
    }
    setNome(data.nome)
    setDriver(data.driver)
    setHost(data.host)
    setPort(String(data.port))
    setDatabase(data.database)
    setUsername(data.username)
    setSsl(data.ssl)
    setTemSenha(data.tem_senha)
    setSenha('')
    setHydrated(true)
  }, [data])

  function payload(incluirSenha: boolean) {
    return {
      nome,
      driver,
      host,
      port: Number(port),
      database,
      username,
      ssl,
      ...(incluirSenha ? { senha } : {}),
    }
  }

  const testar = useMutation({
    mutationFn: async () => {
      if (isEdit && id && senha === '') {
        await api.post(`/conexoes/${id}/testar`)
        return
      }
      await api.post('/conexoes/testar', payload(true))
    },
    onSuccess: () => {
      setError(null)
      setOk('Conexão bem-sucedida.')
    },
    onError: (err) => {
      setOk(null)
      setError(erroApi(err))
    },
  })

  const salvar = useMutation({
    mutationFn: async () => {
      if (isEdit && id) {
        await api.put(`/conexoes/${id}`, payload(senha !== ''))
        return
      }
      await api.post('/conexoes', payload(true))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['conexoes'] })
      navigate('/indicadores/conexoes')
    },
    onError: (err) => setError(erroApi(err)),
  })

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  const podeTestar = host !== '' && database !== '' && username !== '' && (senha !== '' || (isEdit && temSenha))
  const podeSalvar = nome !== '' && podeTestar && (!isEdit || senha !== '' || temSenha)

  return (
    <AppShell ano={vigente.ano} mes={vigente.mes}>
      <PageHeader
        title={isEdit ? 'Editar conexão' : 'Nova conexão'}
        subtitle="Host, banco e usuário. A senha nunca volta na API depois de salva."
        backTo={{ href: '/indicadores/conexoes', label: 'Voltar para conexões' }}
      />
      <Paper sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 640 }}>
        {isEdit && (!hydrated || isLoading) ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            <TextField label="Nome da conexão" value={nome} onChange={(e) => setNome(e.target.value)} required helperText="Ex.: Data warehouse Belluno" />
            <FormControl>
              <InputLabel>Driver</InputLabel>
              <Select label="Driver" value={driver} onChange={(e) => setDriver(String(e.target.value))}>
                <MenuItem value="mysql">MySQL</MenuItem>
              </Select>
            </FormControl>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Host" value={host} onChange={(e) => setHost(e.target.value)} required sx={{ flex: 2 }} placeholder="hostname ou IP" />
              <TextField label="Porta" type="number" value={port} onChange={(e) => setPort(e.target.value)} required sx={{ flex: 1 }} />
            </Stack>
            <TextField label="Banco" value={database} onChange={(e) => setDatabase(e.target.value)} required />
            <TextField label="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="off" />
            <TextField
              label={isEdit ? 'Senha (em branco mantém a atual)' : 'Senha'}
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required={!isEdit}
              autoComplete="new-password"
            />
            <FormControlLabel control={<Checkbox checked={ssl} onChange={(e) => setSsl(e.target.checked)} />} label="Usar SSL" />
            {ok && <Alert severity="success">{ok}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/indicadores/conexoes')}>
                Cancelar
              </Button>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="outlined" onClick={() => testar.mutate()} disabled={!podeTestar || testar.isPending}>
                  Testar conexão
                </Button>
                <Button variant="contained" onClick={() => salvar.mutate()} disabled={!podeSalvar || salvar.isPending}>
                  Salvar
                </Button>
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              A senha é cifrada com a chave da aplicação e fica só no Postgres do Pódio. Não vai para o git.
            </Typography>
          </Stack>
        )}
      </Paper>
    </AppShell>
  )
}
