import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import AddIcon from '@mui/icons-material/Add'
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { FilterBar } from '../components/FilterBar'
import { PageHeader } from '../components/PageHeader'
import { hideColXs, ResponsiveTable } from '../components/ResponsiveTable'
import { AppShell } from '../layout/AppShell'
import { chartLabel, competenciaLabel, escopoLabel, formatBonus, MESES, TIPOS_ESCOPO } from '../lib/labels'
import { departamentosParaSelect } from '../lib/organizacao'
import type { Departamento, TipoEscopo } from '../types'

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
}

export function MetasListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const podeEditar = user?.is_direcao === true
  const [ano, setAno] = useState(2026)
  const [mes, setMes] = useState(9)
  const [departamentoId, setDepartamentoId] = useState<number | ''>('')
  const [tipoEscopo, setTipoEscopo] = useState<TipoEscopo | ''>('')
  const [toDelete, setToDelete] = useState<MetaRow | null>(null)

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
    mutationFn: async (id: number) => api.delete(`/metas/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['metas'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setToDelete(null)
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
                <MenuItem key={nome} value={`${idx + 1}/2026`}>
                  {nome} / 2026
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
                  <TableCell>
                    <Chip size="small" label={escopoLabel(m.tipo_escopo)} />
                  </TableCell>
                  <TableCell sx={hideColXs}>{chartLabel(m.chart_tipo)}</TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {m.chart_tipo === 'marco' ? 'Feito / pendente' : m.chart_tipo === 'comissao' ? 'Gatilhos de comissão' : `${m.valor_meta} ${m.unidade}`}
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums', ...hideColXs }}>{formatBonus(m.valor_bonus)}</TableCell>
                  {podeEditar && (
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
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
      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)}>
        <DialogTitle>Excluir meta?</DialogTitle>
        <DialogContent>
          <Typography>
            A meta “{toDelete?.titulo}” deixa de existir em todas as competências, não só neste mês.
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
