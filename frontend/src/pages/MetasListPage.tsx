import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import AddIcon from '@mui/icons-material/Add'
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Skeleton,
  Stack,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { AlvoChip, BonusChip, TipoIndicadorChip } from '../components/MetaDadoChips'
import { EmptyState } from '../components/EmptyState'
import { EscopoAtribuicao } from '../components/EscopoAtribuicao'
import { FilterBar } from '../components/FilterBar'
import { PageHeader } from '../components/PageHeader'
import { hideColXs, ResponsiveTable } from '../components/ResponsiveTable'
import { AppShell } from '../layout/AppShell'
import { bonusCadastroLabel, competenciaLabel, competenciaVigente, destinosClone, escopoLabel, MESES, TIPOS_ESCOPO } from '../lib/labels'
import { cargosParaEscopo, departamentosParaSelect } from '../lib/organizacao'
import type { AuthUser, Cargo, Departamento, TipoEscopo } from '../types'

type MetaRow = {
  id: number
  titulo: string
  tipo_escopo: TipoEscopo
  chart_tipo: string
  ano: number
  mes: number
  unidade: string
  valor_meta: number
  competencias_count?: number
  valor_bonus?: number | string
  modo_bonus?: string
  departamentos?: { id: number; nome: string }[]
  cargos?: { id: number; nome: string }[]
  usuarios?: { id: number; name: string }[]
  escopo_usuarios?: { id: number; name: string }[]
}

function tipoEscopoPadraoClone(meta: MetaRow): TipoEscopo {
  if (meta.chart_tipo === 'comissao') {
    return meta.tipo_escopo === 'cargo' ? 'cargo' : 'individual'
  }
  return meta.tipo_escopo === 'global' ? 'departamento' : meta.tipo_escopo
}

function rotulosEscopoAtual(meta: MetaRow): string[] {
  if (meta.tipo_escopo === 'individual') {
    return (meta.usuarios ?? []).map((u) => u.name)
  }
  if (meta.tipo_escopo === 'cargo') {
    return (meta.cargos ?? []).map((c) => c.nome)
  }
  if (meta.tipo_escopo === 'departamento') {
    return (meta.departamentos ?? []).map((d) => d.nome)
  }
  return ['Toda a empresa']
}

export function MetasListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const podeEditar = user?.is_direcao === true
  const vigente = competenciaVigente()
  const [ano, setAno] = useState(vigente.ano)
  const [mes, setMes] = useState(vigente.mes)
  const [departamentoId, setDepartamentoId] = useState<number | ''>('')
  const [tipoEscopo, setTipoEscopo] = useState<TipoEscopo | ''>('')
  const [toDelete, setToDelete] = useState<MetaRow | null>(null)
  const [toClone, setToClone] = useState<MetaRow | null>(null)
  const destinos = useMemo(() => destinosClone(), [])
  const [destinoClone, setDestinoClone] = useState(`${destinos[0].mes}/${destinos[0].ano}`)
  const [cloneOk, setCloneOk] = useState<string | null>(null)
  const [cloneErro, setCloneErro] = useState<string | null>(null)
  const [precisaEscopo, setPrecisaEscopo] = useState(false)
  const [novoTipoEscopo, setNovoTipoEscopo] = useState<TipoEscopo>('departamento')
  const [usuariosSel, setUsuariosSel] = useState<AuthUser[]>([])
  const [cargosSel, setCargosSel] = useState<Cargo[]>([])
  const [deptsSel, setDeptsSel] = useState<Departamento[]>([])

  const filtros = useMemo(() => {
    const params = new URLSearchParams({ ano: String(ano), mes: String(mes) })
    if (departamentoId) {
      params.set('departamento_id', String(departamentoId))
    }
    if (tipoEscopo) {
      params.set('tipo_escopo', tipoEscopo)
    }
    return params.toString()
  }, [ano, mes, departamentoId, tipoEscopo])

  const { data: departamentos } = useQuery({
    queryKey: ['departamentos'],
    queryFn: async () => (await api.get('/departamentos')).data as Departamento[],
  })
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get('/usuarios')).data.data as AuthUser[],
    enabled: podeEditar && Boolean(toClone),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['metas', filtros],
    queryFn: async () => (await api.get(`/metas?${filtros}`)).data as MetaRow[],
  })

  const abrir = useMutation({
    mutationFn: async () => api.post('/metas/abrir-competencia', { ano, mes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['metas'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/metas/${id}`, { params: { ano, mes } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['metas'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setToDelete(null)
    },
  })

  const clonar = useMutation({
    mutationFn: async ({
      meta,
      destinoAno,
      destinoMes,
      escopo,
    }: {
      meta: MetaRow
      destinoAno: number
      destinoMes: number
      escopo?: {
        tipo_escopo: TipoEscopo
        usuario_ids: number[]
        cargo_ids: number[]
        departamento_ids: number[]
      }
    }) => {
      const { data } = await api.post(`/metas/${meta.id}/clonar`, {
        ano: destinoAno,
        mes: destinoMes,
        origem_ano: ano,
        origem_mes: mes,
        ...(escopo ?? {}),
      })
      return { meta, destinoAno, destinoMes, duplicada: Boolean(data?.duplicada) }
    },
    onSuccess: ({ meta, destinoAno, destinoMes, duplicada }) => {
      void queryClient.invalidateQueries({ queryKey: ['metas'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setToClone(null)
      setPrecisaEscopo(false)
      setCloneErro(null)
      setCloneOk(
        duplicada
          ? `“${meta.titulo}” clonada em ${competenciaLabel(destinoMes, destinoAno)} para a nova equipe.`
          : `“${meta.titulo}” aberta em ${competenciaLabel(destinoMes, destinoAno)}.`,
      )
    },
    onError: (err) => {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      const escopoMsg = data?.errors?.escopo?.[0]
      if (escopoMsg) {
        setPrecisaEscopo(true)
        setCloneErro(escopoMsg)
        return
      }
      setCloneErro(data?.errors?.mes?.[0] ?? data?.errors?.origem_mes?.[0] ?? data?.message ?? 'Não foi possível clonar a meta.')
    },
  })

  const temFiltro = Boolean(departamentoId) || Boolean(tipoEscopo)

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell ano={ano} mes={mes}>
      <PageHeader
        title="Metas"
        subtitle="Cadastro único por indicador. O alvo e os resultados mudam a cada competência."
        actions={
          <>
            {podeEditar && (
              <Button variant="outlined" onClick={() => abrir.mutate()} disabled={abrir.isPending}>
                Replicar mês anterior
              </Button>
            )}
            {podeEditar && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/metas/nova')}>
                Nova meta
              </Button>
            )}
          </>
        }
      />
      <FilterBar>
          <FormControl size="small">
            <InputLabel>Competência</InputLabel>
            <Select
              label="Competência"
              value={`${mes}/${ano}`}
              onChange={(e) => {
                const [m, a] = String(e.target.value).split('/')
                setMes(Number(m))
                setAno(Number(a))
              }}
            >
              {MESES.map((nome, idx) => (
                <MenuItem key={nome} value={`${idx + 1}/${ano}`}>
                  {nome} / {ano}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Setor</InputLabel>
            <Select
              label="Setor"
              value={departamentoId}
              onChange={(e) => {
                const value: unknown = e.target.value
                setDepartamentoId(value === '' ? '' : Number(value))
              }}
            >
              <MenuItem value="">Todos</MenuItem>
              {(departamentosParaSelect(departamentos) ?? []).map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Escopo</InputLabel>
            <Select
              label="Escopo"
              value={tipoEscopo}
              onChange={(e) => setTipoEscopo(e.target.value as TipoEscopo | '')}
            >
              <MenuItem value="">Todos</MenuItem>
              {TIPOS_ESCOPO.map((tipo) => (
                <MenuItem key={tipo} value={tipo}>
                  {escopoLabel(tipo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
      </FilterBar>
      {cloneOk && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCloneOk(null)}>
          {cloneOk}
        </Alert>
      )}
      <Paper sx={{ overflow: 'hidden' }}>
        <ResponsiveTable>
          <TableHead>
            <TableRow>
              <TableCell>Indicador</TableCell>
              <TableCell>Escopo</TableCell>
              <TableCell sx={hideColXs}>Tipo</TableCell>
              <TableCell>Alvo</TableCell>
              <TableCell sx={hideColXs}>Bônus</TableCell>
              {podeEditar && <TableCell align="right">Ações</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={`sk-${idx}`}>
                    <TableCell colSpan={podeEditar ? 6 : 5}>
                      <Skeleton height={36} />
                    </TableCell>
                  </TableRow>
                ))}
              {(data ?? []).map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {m.titulo}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {competenciaLabel(m.mes, m.ano)}
                      {m.competencias_count && m.competencias_count > 1 ? ` · ${m.competencias_count} meses` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: { xs: 220, sm: 340 } }}>
                    <EscopoAtribuicao
                      tipo={m.tipo_escopo}
                      departamentos={m.departamentos}
                      cargos={m.cargos}
                      usuarios={m.usuarios}
                      pessoas={m.escopo_usuarios}
                    />
                  </TableCell>
                  <TableCell sx={hideColXs}>
                    <TipoIndicadorChip tipo={m.chart_tipo} />
                  </TableCell>
                  <TableCell>
                    <AlvoChip tipo={m.chart_tipo} valor={m.valor_meta} unidade={m.unidade} />
                  </TableCell>
                  <TableCell sx={hideColXs}>
                    <BonusChip
                      valor={m.valor_bonus}
                      label={podeEditar ? bonusCadastroLabel(m) : undefined}
                    />
                  </TableCell>
                  {podeEditar && (
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Clonar para outro mês">
                        <IconButton
                          color="primary"
                          onClick={() => {
                            setCloneErro(null)
                            setCloneOk(null)
                            setPrecisaEscopo(false)
                            setNovoTipoEscopo(tipoEscopoPadraoClone(m))
                            setUsuariosSel([])
                            setCargosSel([])
                            setDeptsSel([])
                            setDestinoClone(`${destinos[0].mes}/${destinos[0].ano}`)
                            setToClone(m)
                          }}
                          aria-label="Clonar meta"
                        >
                          <ContentCopyOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton color="primary" onClick={() => navigate(`/metas/${m.id}/editar?ano=${ano}&mes=${mes}`)} aria-label="Editar meta">
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton color="error" onClick={() => setToDelete(m)} aria-label="Excluir meta">
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
        </ResponsiveTable>
        {!isLoading && (data?.length ?? 0) === 0 && (
          <EmptyState
            title={temFiltro ? 'Nenhuma meta com estes filtros' : 'Nenhuma meta nesta competência'}
            description={
              temFiltro
                ? 'Ajuste o setor ou o tipo de meta para ver outros indicadores.'
                : 'Replique os alvos do mês anterior ou cadastre um indicador novo.'
            }
            action={
              !temFiltro && podeEditar ? (
                <>
                  <Button variant="outlined" onClick={() => abrir.mutate()} disabled={abrir.isPending} sx={{ mr: 1 }}>
                    Replicar mês anterior
                  </Button>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/metas/nova')}>
                    Nova meta
                  </Button>
                </>
              ) : undefined
            }
          />
        )}
      </Paper>
      <Dialog
        open={Boolean(toClone)}
        onClose={() => !clonar.isPending && setToClone(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Clonar meta</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Abrir “{toClone?.titulo}” em qual competência? O alvo deste mês é copiado; os lançamentos não vão junto.
          </Typography>
          <RadioGroup
            value={destinoClone}
            onChange={(e) => {
              setDestinoClone(e.target.value)
              setPrecisaEscopo(false)
              setCloneErro(null)
            }}
          >
            {destinos.map((destino) => (
              <FormControlLabel
                key={`${destino.mes}/${destino.ano}`}
                value={`${destino.mes}/${destino.ano}`}
                control={<Radio />}
                label={destino.mes === destinos[0].mes && destino.ano === destinos[0].ano ? `Mês atual · ${destino.label}` : `Próximo mês · ${destino.label}`}
              />
            ))}
          </RadioGroup>
          {cloneErro && (
            <Alert severity={precisaEscopo ? 'warning' : 'error'} sx={{ mt: 2 }}>
              {cloneErro}
            </Alert>
          )}
          {precisaEscopo && toClone && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Equipe atual: {rotulosEscopoAtual(toClone).join(', ') || escopoLabel(toClone.tipo_escopo)}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {rotulosEscopoAtual(toClone).map((rotulo, idx) => (
                  <Chip key={`${rotulo}-${idx}`} size="small" label={rotulo} />
                ))}
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Recadastre o escopo da cópia
              </Typography>
              <RadioGroup
                value={novoTipoEscopo}
                onChange={(e) => {
                  setNovoTipoEscopo(e.target.value as TipoEscopo)
                  setUsuariosSel([])
                  setCargosSel([])
                  setDeptsSel([])
                }}
              >
                <FormControlLabel value="individual" control={<Radio />} label="Individual (usuários)" />
                <FormControlLabel value="cargo" control={<Radio />} label="Por cargo" />
                {toClone.chart_tipo !== 'comissao' && (
                  <FormControlLabel value="departamento" control={<Radio />} label="Por setor" />
                )}
                {toClone.chart_tipo !== 'comissao' && toClone.tipo_escopo !== 'global' && (
                  <FormControlLabel value="global" control={<Radio />} label="Empresa (todos os setores)" />
                )}
              </RadioGroup>
              {novoTipoEscopo === 'individual' && (
                <Autocomplete
                  multiple
                  options={(usuarios ?? []).filter((o) => o.ativo || usuariosSel.some((s) => s.id === o.id))}
                  getOptionLabel={(o) => o.name}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  value={usuariosSel}
                  onChange={(_, v) => setUsuariosSel(v)}
                  renderInput={(params) => <TextField {...params} label="Usuários" />}
                />
              )}
              {novoTipoEscopo === 'cargo' && (
                <Autocomplete
                  multiple
                  options={cargosParaEscopo(
                    departamentos,
                    cargosSel.map((c) => c.id),
                  )}
                  getOptionLabel={(o) => `${o.nome} (${o.departamento?.nome ?? o.departamento_id})`}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  value={cargosSel}
                  onChange={(_, v) => setCargosSel(v)}
                  renderInput={(params) => <TextField {...params} label="Cargos" />}
                />
              )}
              {novoTipoEscopo === 'departamento' && (
                <Autocomplete
                  multiple
                  options={departamentosParaSelect(
                    departamentos,
                    deptsSel.map((d) => d.id),
                  )}
                  getOptionLabel={(o) => o.nome}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  value={deptsSel}
                  onChange={(_, v) => setDeptsSel(v)}
                  renderInput={(params) => <TextField {...params} label="Setores" />}
                />
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToClone(null)} disabled={clonar.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!toClone || clonar.isPending}
            onClick={() => {
              if (!toClone) {
                return
              }
              const [destinoMes, destinoAno] = destinoClone.split('/').map(Number)
              clonar.mutate({
                meta: toClone,
                destinoAno,
                destinoMes,
                escopo: precisaEscopo
                  ? {
                      tipo_escopo: novoTipoEscopo,
                      usuario_ids: usuariosSel.map((u) => u.id),
                      cargo_ids: cargosSel.map((c) => c.id),
                      departamento_ids: deptsSel.map((d) => d.id),
                    }
                  : undefined,
              })
            }}
          >
            Clonar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)}>
        <DialogTitle>Excluir meta?</DialogTitle>
        <DialogContent>
          <Typography>
            {toDelete && (toDelete.competencias_count ?? 1) > 1
              ? `“${toDelete.titulo}” sai só de ${competenciaLabel(mes, ano)}. Os outros meses continuam.`
              : `“${toDelete?.titulo}” existe só neste mês e deixa de existir.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" disabled={del.isPending} onClick={() => toDelete && del.mutate(toDelete.id)}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  )
}
