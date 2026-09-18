import { useQuery } from '@tanstack/react-query'
import AddIcon from '@mui/icons-material/Add'
import {
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { DashboardGrupoCard } from '../components/DashboardGrupo'
import { EmptyState } from '../components/EmptyState'
import { FilterBar } from '../components/FilterBar'
import { KpiCard } from '../components/KpiCard'
import { PageHeader } from '../components/PageHeader'
import { AppShell } from '../layout/AppShell'
import { MESES } from '../lib/labels'
import { departamentosParaSelect } from '../lib/organizacao'
import type { DashboardGrupo, DashboardKpis, DashboardResponse, Departamento } from '../types'

const TODOS = 'todos'

function grupoKey(grupo: DashboardGrupo): string {
  return `${grupo.tipo}-${grupo.id ?? 'empresa'}`
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ano, setAno] = useState(2026)
  const [mes, setMes] = useState(9)
  const [visao, setVisao] = useState(
    user?.perfil === 'colaborador' ? 'me' : user?.perfil === 'lider' ? 'setor' : 'global',
  )
  const [layout, setLayout] = useState<'analitica' | 'gerencial'>('analitica')
  const [departamentoId, setDepartamentoId] = useState<number | ''>('')
  const [grupoSelecionado, setGrupoSelecionado] = useState(TODOS)

  const { data: departamentos } = useQuery({
    queryKey: ['departamentos'],
    queryFn: async () => (await api.get('/departamentos')).data as Departamento[],
    enabled: user?.is_direcao === true,
  })

  const query = useMemo(() => {
    const params = new URLSearchParams({ ano: String(ano), mes: String(mes), visao })
    if (visao === 'setor' && departamentoId) {
      params.set('departamento_id', String(departamentoId))
    }
    return params.toString()
  }, [ano, mes, visao, departamentoId])

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', query],
    queryFn: async () => (await api.get(`/dashboard?${query}`)).data as DashboardResponse,
  })

  const compact = user?.perfil === 'colaborador' || layout === 'gerencial'
  const grupos = data?.grupos ?? []
  const gruposVisiveis = grupoSelecionado === TODOS ? grupos : grupos.filter((grupo) => grupoKey(grupo) === grupoSelecionado)
  const recorte = gruposVisiveis.length === 1 ? gruposVisiveis[0] : null
  const kpis: DashboardKpis = recorte
    ? {
        ...recorte.kpis,
        setores: recorte.tipo === 'departamento' ? 1 : 0,
        pessoas: recorte.pessoas.length,
      }
    : (data?.kpis ?? { total_ativas: 0, concluidas: 0, desempenho_medio: 0, setores: 0, pessoas: 0 })

  useEffect(() => {
    if (grupoSelecionado === TODOS) {
      return
    }
    if (!grupos.some((grupo) => grupoKey(grupo) === grupoSelecionado)) {
      setGrupoSelecionado(TODOS)
    }
  }, [grupos, grupoSelecionado])

  return (
    <AppShell ano={ano} mes={mes}>
      <PageHeader
        title={user?.perfil === 'colaborador' ? 'Meus indicadores' : 'Painel'}
        subtitle={
          user?.perfil === 'colaborador'
            ? 'Suas metas individuais, do cargo e do setor, organizadas por área.'
            : user?.perfil === 'lider'
              ? 'Todas as metas do seu setor nesta competência.'
              : 'Leitura da competência: empresa, setores e pessoas.'
        }
        actions={
          user?.is_direcao ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/metas/nova')}>
              Nova meta
            </Button>
          ) : undefined
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
          {user?.perfil !== 'colaborador' && (
            <FormControl size="small">
              <InputLabel>Visão</InputLabel>
              <Select label="Visão" value={visao} onChange={(e) => setVisao(e.target.value)}>
                {user?.perfil !== 'lider' && <MenuItem value="global">Empresa</MenuItem>}
                <MenuItem value="setor">Setor</MenuItem>
                <MenuItem value="me">Meu recorte</MenuItem>
              </Select>
            </FormControl>
          )}
          {user?.is_direcao && visao === 'setor' && (
            <FormControl size="small">
              <InputLabel>Setor</InputLabel>
              <Select
                label="Setor"
                value={departamentoId}
                onChange={(e) => setDepartamentoId(Number(e.target.value))}
              >
                {(departamentosParaSelect(departamentos)).map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {user?.is_direcao && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={layout}
              onChange={(_, v) => v && setLayout(v)}
              sx={{ flex: '0 1 auto', flexWrap: 'wrap' }}
            >
              <ToggleButton value="gerencial">Resumo</ToggleButton>
              <ToggleButton value="analitica">Detalhado</ToggleButton>
            </ToggleButtonGroup>
          )}
      </FilterBar>

      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 3 }}>
              <Skeleton variant="rounded" height={112} />
            </Grid>
          ))}
          <Grid size={12}>
            <Skeleton variant="rounded" height={320} />
          </Grid>
        </Grid>
      ) : (
        <>
          {grupos.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2.5 }}>
              <Chip
                clickable
                color={grupoSelecionado === TODOS ? 'primary' : 'default'}
                variant={grupoSelecionado === TODOS ? 'filled' : 'outlined'}
                label="Todos"
                onClick={() => setGrupoSelecionado(TODOS)}
              />
              {grupos.map((grupo) => {
                const key = grupoKey(grupo)
                const ativo = grupoSelecionado === key
                return (
                  <Chip
                    key={key}
                    clickable
                    color={ativo ? 'primary' : 'default'}
                    variant={ativo ? 'filled' : 'outlined'}
                    label={grupo.nome}
                    onClick={() => setGrupoSelecionado(key)}
                  />
                )
              })}
            </Stack>
          )}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard label="Metas ativas" value={`${kpis.total_ativas}`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard label="Concluídas" value={`${kpis.concluidas} de ${kpis.total_ativas}`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                label="Desempenho"
                value={`${kpis.desempenho_medio}%`}
                progress={kpis.desempenho_medio}
                hint={
                  <Typography variant="caption" color="text.secondary">
                    {kpis.concluidas} de {kpis.total_ativas} metas batidas neste recorte
                  </Typography>
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
                label="Setores"
                value={`${kpis.setores ?? 0}`}
                hint={
                  <Typography variant="caption" color="text.secondary">
                    {kpis.pessoas ?? 0} {(kpis.pessoas ?? 0) === 1 ? 'pessoa com meta' : 'pessoas com meta'}
                  </Typography>
                }
              />
            </Grid>
          </Grid>

          <Stack spacing={3}>
            {gruposVisiveis.map((grupo) => (
              <DashboardGrupoCard key={grupoKey(grupo)} grupo={grupo} compact={compact} />
            ))}
          </Stack>

          {gruposVisiveis.length === 0 && (
            <EmptyState title="Nenhuma meta nesta competência" description="Ajuste o filtro ou aguarde o cadastro da Direção." />
          )}
        </>
      )}
    </AppShell>
  )
}
