import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Alert,
  Box,
  Button,
  Collapse,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Fragment, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { EscopoAtribuicao } from '../components/EscopoAtribuicao'
import { BonusChip } from '../components/MetaDadoChips'
import { FilterBar } from '../components/FilterBar'
import { KpiCard } from '../components/KpiCard'
import { PageHeader } from '../components/PageHeader'
import { hideColXs, ResponsiveTable } from '../components/ResponsiveTable'
import { AppShell } from '../layout/AppShell'
import { competenciaLabel, formatBonus, MESES } from '../lib/labels'
import { departamentosParaSelect } from '../lib/organizacao'
import type { Departamento, FechamentoResponse } from '../types'

export function FechamentoPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ano, setAno] = useState(2026)
  const [mes, setMes] = useState(9)
  const [departamentoId, setDepartamentoId] = useState<number | ''>('')
  const [abertos, setAbertos] = useState<number[]>([])

  const filtros = useMemo(() => {
    const params = new URLSearchParams({ ano: String(ano), mes: String(mes) })
    if (departamentoId) {
      params.set('departamento_id', String(departamentoId))
    }
    return params.toString()
  }, [ano, mes, departamentoId])

  const { data: departamentos } = useQuery({
    queryKey: ['departamentos'],
    queryFn: async () => (await api.get('/departamentos')).data as Departamento[],
    enabled: Boolean(user?.is_direcao),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['fechamento', filtros],
    queryFn: async () => (await api.get(`/fechamento?${filtros}`)).data as FechamentoResponse,
  })

  function toggle(id: number) {
    setAbertos((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]))
  }

  return (
    <AppShell ano={ano} mes={mes}>
      <PageHeader
        title="Fechamento do mês"
        subtitle="Quem bateu meta no seu recorte nesta competência e quanto recebe de bônus."
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
              setAbertos([])
            }}
          >
            {MESES.map((nome, idx) => (
              <MenuItem key={nome} value={`${idx + 1}/2026`}>
                {nome} / 2026
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {user?.is_direcao && (
          <FormControl size="small">
            <InputLabel>Setor</InputLabel>
            <Select
              label="Setor"
              value={departamentoId}
              onChange={(e) => {
                const value: unknown = e.target.value
                setDepartamentoId(value === '' ? '' : Number(value))
                setAbertos([])
              }}
            >
              <MenuItem value="">Todos</MenuItem>
              {departamentosParaSelect(departamentos).map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </FilterBar>

      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 4 }}>
              <Skeleton variant="rounded" height={112} />
            </Grid>
          ))}
          <Grid size={12}>
            <Skeleton variant="rounded" height={320} />
          </Grid>
        </Grid>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <KpiCard
                label="Pessoas"
                value={`${data?.pessoas ?? 0}`}
                hint={
                  <Typography variant="caption" color="text.secondary">
                    {competenciaLabel(mes, ano)}
                  </Typography>
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <KpiCard label="Metas batidas" value={`${data?.metas_batidas ?? 0}`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <KpiCard label="Total a pagar" value={formatBonus(data?.total_bonus)} />
            </Grid>
          </Grid>

          {user?.is_direcao && (data?.pessoas ?? 0) > 0 && (data?.total_bonus ?? 0) === 0 && (
            <Alert
              severity="info"
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" onClick={() => navigate('/metas')}>
                  Cadastrar bônus
                </Button>
              }
            >
              Há metas batidas neste mês, mas o valor de bônus ainda está zerado no cadastro. Informe o R$ em cada meta para fechar o pagamento.
            </Alert>
          )}

          {(data?.usuarios.length ?? 0) === 0 ? (
            <Paper>
              <EmptyState
                title="Nenhuma meta batida nesta competência"
                description="Quando um indicador chegar a 100%, as pessoas do escopo entram nesta lista com o bônus cadastrado na meta."
              />
            </Paper>
          ) : (
          <Paper sx={{ overflow: 'hidden' }}>
            <ResponsiveTable minWidth={360}>
              <TableHead>
                <TableRow>
                  <TableCell width={48} />
                  <TableCell>Pessoa</TableCell>
                  <TableCell sx={hideColXs}>Setor</TableCell>
                  <TableCell sx={hideColXs}>Cargo</TableCell>
                  <TableCell align="right">Bônus a receber</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                  {(data?.usuarios ?? []).map((pessoa) => {
                    const aberto = abertos.includes(pessoa.id)
                    return (
                      <Fragment key={pessoa.id}>
                        <TableRow
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => toggle(pessoa.id)}
                        >
                          <TableCell sx={{ pr: 0 }}>
                            <IconButton
                              size="small"
                              aria-label={aberto ? 'Ocultar metas' : 'Ver metas'}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggle(pessoa.id)
                              }}
                            >
                              <ExpandMoreIcon
                                sx={{
                                  transform: aberto ? 'rotate(180deg)' : 'none',
                                  transition: 'transform 0.15s',
                                }}
                              />
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {pessoa.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {pessoa.itens.length} {pessoa.itens.length === 1 ? 'meta batida' : 'metas batidas'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={hideColXs}>{pessoa.departamento ?? '—'}</TableCell>
                          <TableCell sx={hideColXs}>{pessoa.cargo ?? '—'}</TableCell>
                          <TableCell align="right">
                            <BonusChip valor={pessoa.bonus_total} />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={5} sx={{ py: 0, borderBottom: aberto ? undefined : 'none' }}>
                            <Collapse in={aberto} timeout="auto" unmountOnExit>
                              <Box sx={{ px: 2, py: 1.5 }}>
                                <Stack spacing={1}>
                                  {pessoa.itens.map((item) => (
                                    <Stack
                                      key={item.meta_id}
                                      direction={{ xs: 'column', sm: 'row' }}
                                      spacing={1}
                                      sx={{
                                        justifyContent: 'space-between',
                                        alignItems: { sm: 'center' },
                                        py: 0.5,
                                      }}
                                    >
                                      <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2">{item.titulo}</Typography>
                                        <Stack direction="row" spacing={0.75} sx={{ mt: 0.4, alignItems: 'center', flexWrap: 'wrap' }}>
                                          <EscopoAtribuicao tipo={item.tipo_escopo} />
                                          <Typography variant="caption" color="text.secondary">
                                            {item.percentual}% da meta
                                            {item.nivel ? ` · ${item.nivel}` : ''}
                                          </Typography>
                                        </Stack>
                                      </Box>
                                      <BonusChip valor={item.valor_bonus} />
                                    </Stack>
                                  ))}
                                </Stack>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    )
                  })}
                </TableBody>
            </ResponsiveTable>
          </Paper>
          )}
        </>
      )}
    </AppShell>
  )
}
