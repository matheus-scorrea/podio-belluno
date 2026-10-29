import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { AppShell } from '../layout/AppShell'
import { competenciaLabel, competenciaVigente } from '../lib/labels'
import type { DwConexao, Variavel } from '../types'

const steps = ['Identidade', 'Consulta', 'Teste']
const SQL_EXEMPLO = "SELECT valor FROM fato_indicadores WHERE codigo = 'receita_recorrente' AND ano = :ano AND mes = :mes"

function slugify(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'v_$1')
}

function erroApi(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
  return data?.errors?.consulta_sql?.[0] ?? data?.errors?.chave?.[0] ?? data?.errors?.nome?.[0] ?? data?.message ?? 'Não foi possível salvar.'
}

export function VariavelStepperPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const theme = useTheme()
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'), { noSsr: true })
  const { id } = useParams()
  const location = useLocation()
  const isEdit = Boolean(id)
  const vigente = competenciaVigente()

  const [active, setActive] = useState(0)
  const [savedId, setSavedId] = useState<number | null>(id ? Number(id) : null)
  const [nome, setNome] = useState('')
  const [chave, setChave] = useState('')
  const [chaveTravada, setChaveTravada] = useState(Boolean(id))
  const [unidade, setUnidade] = useState('%')
  const [descricao, setDescricao] = useState('')
  const [conexaoId, setConexaoId] = useState<number | ''>('')
  const [consultaSql, setConsultaSql] = useState(SQL_EXEMPLO)
  const [consultaTestada, setConsultaTestada] = useState(false)
  const [valorTeste, setValorTeste] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(!isEdit)

  const { data: conexoes } = useQuery({
    queryKey: ['conexoes'],
    queryFn: async () => (await api.get('/conexoes')).data.data as DwConexao[],
  })
  const { data: variavel, isLoading } = useQuery({
    queryKey: ['variavel', id],
    queryFn: async () => (await api.get(`/variaveis/${id}`)).data as Variavel,
    enabled: isEdit,
  })

  useEffect(() => {
    if (!variavel) {
      return
    }
    setSavedId(variavel.id)
    setNome(variavel.nome)
    setChave(variavel.chave)
    setChaveTravada(true)
    setUnidade(variavel.unidade)
    setDescricao(variavel.descricao ?? '')
    setConexaoId(variavel.conexao_id ?? '')
    setConsultaSql(variavel.consulta_sql ?? SQL_EXEMPLO)
    setConsultaTestada(variavel.consulta_testada === true)
    setValorTeste(variavel.valor_vigente)
    setHydrated(true)
  }, [variavel])

  useEffect(() => {
    const passo = (location.state as { passo?: number } | null)?.passo
    if (typeof passo === 'number' && passo >= 0 && passo <= 2) {
      setActive(passo)
    }
  }, [location.state])

  function payload() {
    return {
      nome,
      unidade,
      descricao: descricao || null,
      consulta_sql: consultaSql,
      conexao_id: conexaoId === '' ? null : conexaoId,
      ...(chaveTravada ? {} : { chave }),
    }
  }

  const salvar = useMutation({
    mutationFn: async () => {
      if (savedId) {
        const { data } = await api.put(`/variaveis/${savedId}`, payload())
        return data as Variavel
      }
      const { data } = await api.post('/variaveis', { ...payload(), chave })
      return data as Variavel
    },
    onSuccess: async (salva) => {
      setSavedId(salva.id)
      setChaveTravada(true)
      setChave(salva.chave)
      setConsultaTestada(salva.consulta_testada === true)
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['variaveis'] })
      if (!id) {
        navigate(`/indicadores/${salva.id}/editar`, { replace: true, state: { passo: active === 1 ? 2 : active } })
      }
    },
    onError: (err) => setError(erroApi(err)),
  })

  const testar = useMutation({
    mutationFn: async (alvoId: number) => (await api.post(`/variaveis/${alvoId}/testar`)).data as { valor: number; ano: number; mes: number },
    onSuccess: (resultado) => {
      setValorTeste(resultado.valor)
      setConsultaTestada(true)
      setError(null)
      setAviso(`A consulta devolveu ${resultado.valor} para ${competenciaLabel(resultado.mes, resultado.ano)}.`)
    },
    onError: (err) => {
      setConsultaTestada(false)
      setAviso(null)
      setError(erroApi(err))
    },
  })

  const publicar = useMutation({
    mutationFn: async (alvoId: number) => (await api.post(`/variaveis/${alvoId}/publicar`)).data as Variavel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['variaveis'] })
      navigate('/indicadores')
    },
    onError: (err) => setError(erroApi(err)),
  })

  async function persistir(): Promise<number | null> {
    try {
      const salva = await salvar.mutateAsync()
      return salva.id
    } catch {
      return null
    }
  }

  async function irParaTeste() {
    const alvoId = await persistir()
    if (alvoId) {
      setActive(2)
    }
  }

  async function rodarTeste() {
    const alvoId = savedId ?? (await persistir())
    if (alvoId) {
      await testar.mutateAsync(alvoId)
    }
  }

  async function publicarAgora() {
    const alvoId = savedId ?? (await persistir())
    if (alvoId) {
      await publicar.mutateAsync(alvoId)
    }
  }

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell ano={vigente.ano} mes={vigente.mes}>
      <PageHeader
        title={isEdit ? 'Editar variável' : 'Nova variável'}
        subtitle="A consulta SQL sempre roda no mês atual. Na virada, o último valor fica fixo para o mês que fechou."
        backTo={{ href: '/indicadores', label: 'Voltar para indicadores' }}
      />
      <Paper sx={{ p: { xs: 2, md: 3.5 } }}>
        {isEdit && (!hydrated || isLoading) ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Stepper
              activeStep={active}
              alternativeLabel={isSmUp}
              orientation={isSmUp ? 'horizontal' : 'vertical'}
              sx={{ mb: 4, '& .MuiStepIcon-root.Mui-completed, & .MuiStepIcon-root.Mui-active': { color: 'primary.main' } }}
            >
              {steps.map((s) => (
                <Step key={s}>
                  <StepLabel>{s}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {active === 0 && (
              <Stack spacing={2.5} sx={{ maxWidth: 640 }}>
                <TextField
                  label="Nome"
                  value={nome}
                  onChange={(e) => {
                    const next = e.target.value
                    setNome(next)
                    if (!chaveTravada) {
                      setChave(slugify(next))
                    }
                  }}
                  required
                  helperText="Aparece no cadastro da meta."
                />
                <TextField
                  label="Chave"
                  value={chave}
                  onChange={(e) => setChave(e.target.value.toLowerCase())}
                  required
                  disabled={chaveTravada}
                  helperText={chaveTravada ? 'A chave não muda depois do primeiro save.' : 'Identificador técnico, só letras minúsculas, números e underscore.'}
                />
                <FormControl>
                  <InputLabel>Unidade</InputLabel>
                  <Select label="Unidade" value={unidade} onChange={(e) => setUnidade(String(e.target.value))}>
                    <MenuItem value="%">%</MenuItem>
                    <MenuItem value="R$">R$</MenuItem>
                    <MenuItem value="un">Unidades</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Descrição"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  multiline
                  minRows={2}
                  helperText="Texto de ajuda para quem escolhe a variável na meta."
                />
              </Stack>
            )}
            {active === 1 && (
              <Stack spacing={2} sx={{ maxWidth: 880 }}>
                <FormControl required>
                  <InputLabel>Conexão</InputLabel>
                  <Select
                    label="Conexão"
                    value={conexaoId}
                    onChange={(e) => {
                      setConexaoId(Number(e.target.value))
                      setConsultaTestada(false)
                    }}
                  >
                    {(conexoes ?? []).map((conexao) => (
                      <MenuItem key={conexao.id} value={conexao.id}>
                        {conexao.nome} ({conexao.host}/{conexao.database})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {(conexoes ?? []).length === 0 && (
                  <Alert severity="warning">
                    Cadastre uma conexão em Indicadores → Conexões antes de testar a SQL.
                  </Alert>
                )}
                <Typography variant="body2" color="text.secondary">
                  Um único SELECT, com :ano e :mes do mês calendário vigente. Deve devolver uma linha e um número. O Pódio não zera na virada — a própria consulta, já no mês novo, devolve o acumulado (em geral zero).
                </Typography>
                <TextField
                  label="Consulta SQL"
                  value={consultaSql}
                  onChange={(e) => {
                    setConsultaSql(e.target.value)
                    setConsultaTestada(false)
                    setAviso(null)
                  }}
                  multiline
                  minRows={8}
                  slotProps={{ input: { sx: { fontFamily: 'ui-monospace, monospace', fontSize: 14 } } }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                  Exemplo: {SQL_EXEMPLO}
                </Typography>
              </Stack>
            )}
            {active === 2 && (
              <Stack spacing={2} sx={{ maxWidth: 640 }}>
                <Typography variant="body2">
                  O teste usa {competenciaLabel(vigente.mes, vigente.ano)}. Sem seletor de competência.
                </Typography>
                <Button variant="outlined" onClick={() => void rodarTeste()} disabled={testar.isPending || salvar.isPending}>
                  Testar consulta
                </Button>
                {aviso && <Alert severity="success">{aviso}</Alert>}
                {valorTeste != null && !aviso && (
                  <Typography variant="body2" color="text.secondary">
                    Último valor conhecido no mês vigente: {valorTeste}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Publicar só depois de um teste ok com a SQL atual. Rascunho não aparece no cadastro da meta.
                </Typography>
              </Stack>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}
            <Divider sx={{ mt: 4, mb: 2.5 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/indicadores')}>
                  Voltar
                </Button>
                <Button disabled={active === 0} onClick={() => setActive((s) => s - 1)}>
                  Etapa anterior
                </Button>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button onClick={() => void persistir()} disabled={salvar.isPending || !nome || !chave}>
                  Salvar rascunho
                </Button>
                {active === 0 && (
                  <Button variant="contained" onClick={() => setActive(1)} disabled={!nome || !chave}>
                    Continuar
                  </Button>
                )}
                {active === 1 && (
                  <Button variant="contained" onClick={() => void irParaTeste()} disabled={!consultaSql.trim() || conexaoId === '' || salvar.isPending}>
                    Continuar para teste
                  </Button>
                )}
                {active === 2 && (
                  <Button variant="contained" onClick={() => void publicarAgora()} disabled={!consultaTestada || publicar.isPending}>
                    Publicar variável
                  </Button>
                )}
              </Stack>
            </Stack>
          </>
        )}
      </Paper>
    </AppShell>
  )
}
