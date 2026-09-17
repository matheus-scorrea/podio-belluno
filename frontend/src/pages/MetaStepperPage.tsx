import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { previewMeta, renderMetaChart } from '../charts/chartFactory'
import { PageHeader } from '../components/PageHeader'
import { AppShell } from '../layout/AppShell'
import { nivelEmBranco, TABELA_BELLUNO, type NivelComissao } from '../lib/comissao'
import { MESES } from '../lib/labels'
import { cargosParaEscopo, departamentosParaSelect } from '../lib/organizacao'
import type { AuthUser, Cargo, ChartTipo, Departamento, MetaDetail, Sentido, TipoEscopo } from '../types'

const steps = ['Dados', 'Escopo', 'Visualização']
const cores = ['#00A8E8', '#0077B6', '#10B981', '#F59E0B', '#EF4444', '#0A1128']

function tipoIndicador(chartTipo: ChartTipo): 'quantitativo' | 'marco' | 'comissao' {
  if (chartTipo === 'marco') {
    return 'marco'
  }
  if (chartTipo === 'comissao') {
    return 'comissao'
  }
  return 'quantitativo'
}

export function MetaStepperPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)

  const [active, setActive] = useState(0)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ano, setAno] = useState(2026)
  const [mes, setMes] = useState(9)
  const [unidade, setUnidade] = useState('%')
  const [valorMeta, setValorMeta] = useState('100')
  const [valorBonus, setValorBonus] = useState('0')
  const [sentido, setSentido] = useState<Sentido>('maior_melhor')
  const [tipoEscopo, setTipoEscopo] = useState<TipoEscopo>('departamento')
  const [usuariosSel, setUsuariosSel] = useState<AuthUser[]>([])
  const [cargosSel, setCargosSel] = useState<Cargo[]>([])
  const [deptsSel, setDeptsSel] = useState<Departamento[]>([])
  const [chartTipo, setChartTipo] = useState<ChartTipo>('gauge')
  const [chartCor, setChartCor] = useState('#00A8E8')
  const [niveis, setNiveis] = useState<NivelComissao[]>(TABELA_BELLUNO)
  const [marcoPorPessoa, setMarcoPorPessoa] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(!isEdit)

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get('/usuarios')).data.data as AuthUser[],
  })
  const { data: departamentos } = useQuery({
    queryKey: ['departamentos'],
    queryFn: async () => (await api.get('/departamentos')).data as Departamento[],
  })
  const { data: meta, isLoading } = useQuery({
    queryKey: ['meta', id, searchParams.get('ano'), searchParams.get('mes')],
    queryFn: async () => {
      const anoQ = searchParams.get('ano')
      const mesQ = searchParams.get('mes')
      const qs = anoQ && mesQ ? `?ano=${anoQ}&mes=${mesQ}` : ''
      return (await api.get(`/metas/${id}${qs}`)).data as MetaDetail
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (!meta) {
      return
    }
    setTitulo(meta.titulo)
    setDescricao(meta.descricao ?? '')
    setAno(meta.ano)
    setMes(meta.mes)
    setUnidade(meta.unidade)
    setValorMeta(String(meta.valor_meta))
    setValorBonus(String(meta.valor_bonus ?? 0))
    setSentido(meta.sentido)
    setTipoEscopo(meta.tipo_escopo)
    setUsuariosSel(meta.usuarios ?? [])
    setCargosSel(meta.cargos ?? [])
    setDeptsSel(meta.departamentos ?? [])
    setChartTipo(meta.chart_tipo)
    setChartCor(meta.chart_cor)
    if (meta.niveis_comissao && meta.niveis_comissao.length > 0) {
      setNiveis(meta.niveis_comissao)
    }
    setMarcoPorPessoa(Boolean(meta.marco_por_pessoa))
    setHydrated(true)
  }, [meta])

  useEffect(() => {
    const atual = meta?.competencias?.find((c) => c.ano === ano && c.mes === mes)
    if (atual && chartTipo !== 'comissao') {
      setValorMeta(String(atual.valor_meta))
    }
  }, [ano, mes, meta, chartTipo])

  function payload() {
    const ehMarco = chartTipo === 'marco'
    const ehComissao = chartTipo === 'comissao'
    return {
      titulo,
      descricao,
      ano,
      mes,
      tipo_escopo: tipoEscopo,
      valor_meta: ehMarco ? 1 : ehComissao ? Math.max(...niveis.map((n) => Number(n.venda_min) || 0), 0) : Number(valorMeta),
      valor_bonus: Number(valorBonus),
      unidade: ehMarco ? 'marco' : ehComissao ? 'R$' : unidade,
      sentido: ehMarco || ehComissao ? 'maior_melhor' : sentido,
      chart_tipo: chartTipo,
      chart_cor: chartCor,
      usuario_ids: usuariosSel.map((u) => u.id),
      cargo_ids: cargosSel.map((c) => c.id),
      departamento_ids: deptsSel.map((d) => d.id),
      niveis_comissao: ehComissao ? niveis : undefined,
      marco_por_pessoa: ehMarco && (tipoEscopo !== 'individual' || usuariosSel.length > 1) && marcoPorPessoa,
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit && id) {
        await api.put(`/metas/${id}`, payload())
        return
      }
      await api.post('/metas', payload())
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['metas'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['meta'] }),
        queryClient.invalidateQueries({ queryKey: ['fechamento'] }),
      ])
      navigate('/metas')
    },
    onError: () => setError('Não foi possível salvar a meta. Verifique os campos obrigatórios.'),
  })

  const ehComissao = chartTipo === 'comissao'
  const escopoPodeVariasPessoas = tipoEscopo !== 'individual' || usuariosSel.length > 1
  const mostrarMarcoPorPessoa = chartTipo === 'marco' && escopoPodeVariasPessoas
  const preview = previewMeta(chartTipo, chartCor, { marcoPorPessoa: mostrarMarcoPorPessoa && marcoPorPessoa })

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell ano={ano} mes={mes}>
      <PageHeader
        title={isEdit ? 'Editar meta' : 'Nova meta'}
        subtitle={isEdit ? 'O cadastro é único. Ajuste o indicador e o alvo da competência escolhida.' : 'Dados do indicador, quem se aplica e como aparece no painel.'}
        backTo={{ href: '/metas', label: 'Voltar para metas' }}
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
              alternativeLabel
              sx={{
                mb: 4,
                '& .MuiStepIcon-root.Mui-completed, & .MuiStepIcon-root.Mui-active': { color: 'primary.main' },
              }}
            >
              {steps.map((s) => (
                <Step key={s}>
                  <StepLabel>{s}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {active === 0 && (
              <Stack spacing={2.5} sx={{ maxWidth: ehComissao ? 960 : 640 }}>
                <TextField label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
                <TextField
                  label="Descrição"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  multiline
                  minRows={3}
                />
                <FormControl>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                    Tipo de indicador
                  </Typography>
                  <RadioGroup
                    value={tipoIndicador(chartTipo)}
                    onChange={(e) => {
                      if (e.target.value === 'marco') {
                        setChartTipo('marco')
                        setUnidade('marco')
                        setValorMeta('1')
                        setSentido('maior_melhor')
                        return
                      }
                      if (e.target.value === 'comissao') {
                        setChartTipo('comissao')
                        setUnidade('R$')
                        setSentido('maior_melhor')
                        setTipoEscopo((atual) => (atual === 'cargo' || atual === 'individual' ? atual : 'cargo'))
                        return
                      }
                      if (chartTipo === 'marco' || chartTipo === 'comissao') {
                        setChartTipo('gauge')
                        setUnidade('%')
                        setValorMeta('100')
                      }
                    }}
                  >
                    <FormControlLabel value="quantitativo" control={<Radio />} label="Quantitativa (número, %, R$)" />
                    <FormControlLabel value="marco" control={<Radio />} label="Por marco (feito / não feito)" />
                    <FormControlLabel value="comissao" control={<Radio />} label="Comissão de vendedor (receita + adesão)" />
                  </RadioGroup>
                </FormControl>
                {chartTipo === 'marco' && (
                  <Alert severity="info">
                    Esta meta é concluída quando o marco é marcado como feito. Não há alvo numérico. No escopo, você
                    escolhe se o feito vale para o grupo ou para cada pessoa.
                  </Alert>
                )}
                {ehComissao && (
                  <Alert severity="info">
                    No mês entram só receita recorrente e adesão. Os gatilhos abaixo definem a faixa, o % e o prêmio.
                  </Alert>
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl sx={{ minWidth: 180, flex: 1 }}>
                    <InputLabel>Competência (alvo)</InputLabel>
                    <Select label="Competência (alvo)" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                      {MESES.map((nome, i) => (
                        <MenuItem key={nome} value={i + 1}>
                          {nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField label="Ano" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} sx={{ flex: 1 }} />
                  {chartTipo !== 'marco' && !ehComissao && (
                    <FormControl sx={{ minWidth: 140, flex: 1 }}>
                      <InputLabel>Unidade</InputLabel>
                      <Select label="Unidade" value={unidade} onChange={(e) => setUnidade(String(e.target.value))}>
                        <MenuItem value="%">%</MenuItem>
                        <MenuItem value="R$">R$</MenuItem>
                        <MenuItem value="un">Unidades</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </Stack>
                {ehComissao ? (
                  <Stack spacing={1.5}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Gatilhos de desempenho
                      </Typography>
                      <Button size="small" onClick={() => setNiveis(TABELA_BELLUNO)}>
                        Usar tabela Belluno (6 metas)
                      </Button>
                    </Stack>
                    {niveis.map((nivel, indice) => (
                      <Stack key={`${nivel.nome}-${indice}`} direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' } }}>
                        <TextField
                          label="Nome"
                          value={nivel.nome}
                          onChange={(e) => {
                            const copia = [...niveis]
                            copia[indice] = { ...copia[indice], nome: e.target.value }
                            setNiveis(copia)
                          }}
                          sx={{ minWidth: 110, flex: 1 }}
                        />
                        <TextField
                          label="Venda mín."
                          type="number"
                          value={nivel.venda_min}
                          onChange={(e) => {
                            const copia = [...niveis]
                            copia[indice] = { ...copia[indice], venda_min: Number(e.target.value) }
                            setNiveis(copia)
                          }}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Adesão mín."
                          type="number"
                          value={nivel.adesao_min}
                          onChange={(e) => {
                            const copia = [...niveis]
                            copia[indice] = { ...copia[indice], adesao_min: Number(e.target.value) }
                            setNiveis(copia)
                          }}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="% comissão"
                          type="number"
                          value={nivel.percentual}
                          onChange={(e) => {
                            const copia = [...niveis]
                            copia[indice] = { ...copia[indice], percentual: Number(e.target.value) }
                            setNiveis(copia)
                          }}
                          sx={{ width: { md: 120 } }}
                        />
                        <TextField
                          label="Prêmio"
                          type="number"
                          value={nivel.premio}
                          onChange={(e) => {
                            const copia = [...niveis]
                            copia[indice] = { ...copia[indice], premio: Number(e.target.value) }
                            setNiveis(copia)
                          }}
                          sx={{ flex: 1 }}
                        />
                        <IconButton
                          aria-label="Remover gatilho"
                          onClick={() => setNiveis(niveis.filter((_, i) => i !== indice))}
                          disabled={niveis.length <= 1}
                        >
                          <DeleteOutlinedIcon />
                        </IconButton>
                      </Stack>
                    ))}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setNiveis([...niveis, nivelEmBranco(niveis.length + 1)])}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Adicionar gatilho
                    </Button>
                  </Stack>
                ) : (
                  chartTipo !== 'marco' && (
                    <>
                      <TextField label="Alvo nesta competência" type="number" value={valorMeta} onChange={(e) => setValorMeta(e.target.value)} />
                      <FormControl>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                          Sentido do indicador
                        </Typography>
                        <RadioGroup row value={sentido} onChange={(e) => setSentido(e.target.value as Sentido)}>
                          <FormControlLabel value="maior_melhor" control={<Radio />} label="Maior é melhor" />
                          <FormControlLabel value="menor_melhor" control={<Radio />} label="Menor é melhor" />
                        </RadioGroup>
                      </FormControl>
                    </>
                  )
                )}
                {!ehComissao && (
                  <TextField
                    label="Valor do bônus"
                    type="number"
                    value={valorBonus}
                    onChange={(e) => setValorBonus(e.target.value)}
                    helperText="Pago no fechamento do mês quando a meta é batida. Não aparece no painel."
                  />
                )}
              </Stack>
            )}
            {active === 1 && (
              <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
                <Typography variant="body2" color="text.secondary">
                  {ehComissao
                    ? 'Escolha os vendedores ou o cargo. Cada pessoa lança a própria receita e adesão.'
                    : 'Defina quem se enquadra nesta meta. O colaborador só vê o que estiver no próprio recorte.'}
                </Typography>
                <RadioGroup value={tipoEscopo} onChange={(e) => setTipoEscopo(e.target.value as TipoEscopo)}>
                  <FormControlLabel value="individual" control={<Radio />} label="Individual (usuários)" />
                  <FormControlLabel value="cargo" control={<Radio />} label="Por cargo" />
                  {!ehComissao && <FormControlLabel value="departamento" control={<Radio />} label="Por setor" />}
                  {!ehComissao && <FormControlLabel value="global" control={<Radio />} label="Empresa (todos os setores)" />}
                </RadioGroup>
                {tipoEscopo === 'individual' && (
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
                {tipoEscopo === 'cargo' && (
                  <Autocomplete
                    multiple
                    options={cargosParaEscopo(departamentos, cargosSel.map((c) => c.id))}
                    getOptionLabel={(o) => `${o.nome} (${o.departamento?.nome ?? o.departamento_id})`}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    value={cargosSel}
                    onChange={(_, v) => setCargosSel(v)}
                    renderInput={(params) => <TextField {...params} label="Cargos" />}
                  />
                )}
                {tipoEscopo === 'departamento' && !ehComissao && (
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
                {mostrarMarcoPorPessoa && (
                  <FormControl>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                      Como o marco é concluído
                    </Typography>
                    <RadioGroup
                      value={marcoPorPessoa ? 'por_pessoa' : 'compartilhado'}
                      onChange={(e) => setMarcoPorPessoa(e.target.value === 'por_pessoa')}
                    >
                      <FormControlLabel
                        value="compartilhado"
                        control={<Radio />}
                        label="Um marco compartilhado: quem disparar marca para o grupo"
                      />
                      <FormControlLabel
                        value="por_pessoa"
                        control={<Radio />}
                        label="Cada pessoa conclui o próprio marco"
                      />
                    </RadioGroup>
                  </FormControl>
                )}
              </Stack>
            )}
            {active === 2 && (
              <Stack spacing={3}>
                <Typography color="text.secondary">
                  Defina como o indicador aparece no painel.
                </Typography>
                {chartTipo === 'marco' ? (
                  <Alert severity="info">
                    {mostrarMarcoPorPessoa && marcoPorPessoa
                      ? 'O painel lista feito ou pendente por pessoa. O marco só fica concluído quando todas concluírem.'
                      : 'O painel mostra só se o marco foi concluído ou ainda está pendente.'}
                  </Alert>
                ) : ehComissao ? (
                  <Alert severity="info">
                    O painel mostra a faixa atingida, a comissão, o prêmio e o total da remuneração variável.
                  </Alert>
                ) : (
                  <>
                    {chartTipo === 'column' && (tipoEscopo === 'global' || deptsSel.length > 1) && (
                      <Alert severity="info">
                        Cada líder lançará a barra do próprio setor. A Direção pode lançar qualquer setor.
                      </Alert>
                    )}
                    <ToggleButtonGroup exclusive value={chartTipo} onChange={(_, v) => v && setChartTipo(v)} sx={{ flexWrap: 'wrap' }}>
                      <ToggleButton value="gauge">Velocímetro</ToggleButton>
                      <ToggleButton value="progress_bar">Barra de progresso</ToggleButton>
                      <ToggleButton value="line">Linha temporal</ToggleButton>
                      <ToggleButton value="column">Barras comparativas</ToggleButton>
                    </ToggleButtonGroup>
                  </>
                )}
                <Stack direction="row" spacing={1}>
                  {cores.map((c) => (
                    <Box
                      key={c}
                      role="button"
                      tabIndex={0}
                      aria-label={`Cor ${c}`}
                      onClick={() => setChartCor(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setChartCor(c)
                        }
                      }}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: c,
                        cursor: 'pointer',
                        outline: chartCor === c ? '3px solid #0A1128' : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </Stack>
                <Paper sx={{ p: 2, maxWidth: ehComissao ? 960 : 640 }}>{renderMetaChart(preview)}</Paper>
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
                <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/metas')}>
                  Voltar para metas
                </Button>
                <Button disabled={active === 0} onClick={() => setActive((s) => s - 1)}>
                  Etapa anterior
                </Button>
              </Stack>
              {active < 2 ? (
                <Button variant="contained" onClick={() => setActive((s) => s + 1)} disabled={active === 0 && !titulo}>
                  Continuar
                </Button>
              ) : (
                <Button variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                  {isEdit ? 'Salvar alterações' : 'Publicar meta'}
                </Button>
              )}
            </Stack>
          </>
        )}
      </Paper>
    </AppShell>
  )
}
