import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined'
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
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { previewMeta, renderMetaChart } from '../charts/chartFactory'
import { PageHeader } from '../components/PageHeader'
import { AppShell } from '../layout/AppShell'
import { nivelEmBranco, TABELA_BELLUNO, type NivelComissao } from '../lib/comissao'
import { faixaEmBranco, TABELA_SDR_REUNIOES, type NivelFaixa } from '../lib/faixaUnidade'
import { formatBonus, MESES } from '../lib/labels'
import { cargosParaEscopo, departamentosParaSelect } from '../lib/organizacao'
import type { AuthUser, Cargo, ChartTipo, Departamento, MetaDetail, ModoBonus, Sentido, TipoEscopo } from '../types'

const steps = ['Dados', 'Escopo', 'Visualização']
const cores = ['#00A8E8', '#0077B6', '#10B981', '#F59E0B', '#EF4444', '#0A1128']

function numeroExemplo(valor: string, fallback: number): number {
  const n = Number(valor)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function BonusModoHelp({
  modo,
  valorBonus,
  valorMeta,
  bonusPiso,
  bonusTeto,
  bonusPorUnidade,
}: {
  modo: ModoBonus
  valorBonus: string
  valorMeta: string
  bonusPiso: string
  bonusTeto: string
  bonusPorUnidade: string
}) {
  const bonus = numeroExemplo(valorBonus, 200)
  const alvo = numeroExemplo(valorMeta, 10)
  const piso = numeroExemplo(bonusPiso, 100)
  const extra = numeroExemplo(bonusPorUnidade, 25)
  const teto = bonusTeto !== '' && Number(bonusTeto) > 0 ? Number(bonusTeto) : null
  const acima = alvo * 1.5
  const unidadesAMais = 4

  const conteudo =
    modo === 'linear' ? (
      <>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Proporcional
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Atingimento = realizado ÷ alvo × 100. Abaixo do piso ({piso}%), o bônus é {formatBonus(0)}. A partir do piso, o valor acompanha o atingimento:
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          {teto
            ? `pagamento = ${formatBonus(bonus)} × min(atingimento, ${teto}%) ÷ 100`
            : `pagamento = ${formatBonus(bonus)} × atingimento ÷ 100`}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Ex.: alvo {alvo}, fez {acima} ({Math.round((acima / alvo) * 100)}%) →{' '}
          {formatBonus(bonus * Math.min((acima / alvo) * 100, teto ?? Infinity) / 100)}.
          {teto ? ` O teto de ${teto}% limita o dinheiro, não o indicador.` : ' Sem teto, o valor continua subindo.'}
        </Typography>
      </>
    ) : modo === 'unidade' ? (
      <>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Por unidade extra
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Abaixo do alvo, o bônus é {formatBonus(0)}. Ao bater o alvo:
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          pagamento = {formatBonus(bonus)} + (realizado − {alvo}) × {formatBonus(extra)}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Ex.: fez {alvo + unidadesAMais} → {formatBonus(bonus + unidadesAMais * extra)}.
        </Typography>
      </>
    ) : modo === 'faixa_unidade' ? (
      <>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Por faixas de quantidade
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          A maior faixa cujo piso foi atingido define a taxa. O pagamento é quantidade realizada × taxa da faixa, sobre o total do mês.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Ex. SDR: 32 reuniões entram na Meta 2 (R$ 12) → {formatBonus(32 * 12)}. Abaixo do primeiro piso, o bônus é {formatBonus(0)}.
        </Typography>
      </>
    ) : modo === 'por_unidade' ? (
      <>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Por unidade
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Cada unidade realizada paga {formatBonus(bonus)}, desde a primeira. Não depende de bater o alvo.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Ex.: 3 contratos → {formatBonus(3 * bonus)}.
        </Typography>
      </>
    ) : (
      <>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Fixo
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Tudo ou nada. Bateu o alvo (100%), recebe {formatBonus(bonus)}. Acima do alvo, o valor não aumenta.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Fez {acima} → {formatBonus(bonus)}. Fez {Math.round(alvo * 0.9)} → {formatBonus(0)}.
        </Typography>
      </>
    )

  return (
    <Box sx={{ p: 0.25, maxWidth: 340 }}>
      {conteudo}
    </Box>
  )
}

function TipoIndicadorHelp({ tipo }: { tipo: 'quantitativo' | 'marco' | 'comissao' }) {
  const conteudo =
    tipo === 'marco' ? (
      <>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Por marco
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Feito ou não feito. Não tem alvo numérico nem lançamento de quantidade: a meta fecha quando o marco é marcado como concluído.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          O bônus é tudo ou nada. No escopo você escolhe se o feito vale para o grupo inteiro ou para cada pessoa.
        </Typography>
      </>
    ) : tipo === 'comissao' ? (
      <>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Comissão de vendedor
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Cada vendedor lança a própria receita recorrente e a adesão no mês. As faixas (níveis) definem o percentual e o prêmio.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Não usa piso, teto nem unidade extra: o pagamento sai da tabela de comissão.
        </Typography>
      </>
    ) : (
      <>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Quantitativa
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          Meta com número — %, R$ ou quantidade. Tem alvo e lançamentos no mês. O atingimento é realizado ÷ alvo.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          O bônus pode ser fixo, proporcional, por unidade extra, por faixas de quantidade ou por unidade desde a primeira. No painel aparece como velocímetro, barra ou gráfico.
        </Typography>
      </>
    )

  return (
    <Box sx={{ p: 0.25, maxWidth: 340 }}>
      {conteudo}
    </Box>
  )
}

function CampoHelp({
  ariaLabel,
  children,
}: {
  ariaLabel: string
  children: ReactNode
}) {
  return (
    <Tooltip
      arrow
      describeChild
      placement="top"
      enterTouchDelay={0}
      leaveTouchDelay={5000}
      slotProps={{ tooltip: { sx: { maxWidth: 360, p: 1.25 } } }}
      title={children}
    >
      <IconButton size="small" aria-label={ariaLabel} sx={{ p: 0.25, color: 'text.secondary' }}>
        <HelpOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  )
}

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
  const theme = useTheme()
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'))
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
  const [faixas, setFaixas] = useState<NivelFaixa[]>(TABELA_SDR_REUNIOES)
  const [porPessoa, setPorPessoa] = useState(false)
  const [modoBonus, setModoBonus] = useState<ModoBonus>('fixo')
  const [bonusPiso, setBonusPiso] = useState('100')
  const [bonusTeto, setBonusTeto] = useState('')
  const [bonusPorUnidade, setBonusPorUnidade] = useState('0')
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
    if (meta.niveis_faixa && meta.niveis_faixa.length > 0) {
      setFaixas(meta.niveis_faixa)
    }
    setPorPessoa(meta.marco_por_pessoa === true || meta.marco_por_pessoa === 1)
    setModoBonus(meta.modo_bonus ?? 'fixo')
    setBonusPiso(String(meta.bonus_piso_percentual ?? 100))
    setBonusTeto(meta.bonus_teto_percentual == null ? '' : String(meta.bonus_teto_percentual))
    setBonusPorUnidade(String(meta.bonus_por_unidade_extra ?? 0))
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
      niveis_faixa: !ehMarco && !ehComissao && sentido !== 'menor_melhor' && modoBonus === 'faixa_unidade'
        ? faixas
        : undefined,
      marco_por_pessoa: porPessoa,
      modo_bonus: ehMarco || ehComissao || sentido === 'menor_melhor' ? 'fixo' : modoBonus,
      bonus_piso_percentual: !ehMarco && !ehComissao && sentido !== 'menor_melhor' && modoBonus === 'linear'
        ? Number(bonusPiso)
        : null,
      bonus_teto_percentual: !ehMarco && !ehComissao && sentido !== 'menor_melhor' && modoBonus === 'linear' && bonusTeto !== ''
        ? Number(bonusTeto)
        : null,
      bonus_por_unidade_extra: !ehMarco && !ehComissao && sentido !== 'menor_melhor' && modoBonus === 'unidade'
        ? Number(bonusPorUnidade)
        : null,
    }
  }

  const mutation = useMutation({
    mutationFn: async (body: ReturnType<typeof payload>) => {
      if (isEdit && id) {
        await api.put(`/metas/${id}`, body)
        return
      }
      await api.post('/metas', body)
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
  const ehQuantitativa = chartTipo !== 'marco' && !ehComissao
  const ehFaixaUnidade = ehQuantitativa && modoBonus === 'faixa_unidade'
  const escopoPodeVariasPessoas = tipoEscopo !== 'individual' || usuariosSel.length > 1
  const mostrarPorPessoa = (chartTipo === 'marco' || ehQuantitativa) && escopoPodeVariasPessoas
  const preview = previewMeta(chartTipo, chartCor, { porPessoa: mostrarPorPessoa && porPessoa })

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
              alternativeLabel={isSmUp}
              orientation={isSmUp ? 'horizontal' : 'vertical'}
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
              <Stack spacing={2.5} sx={{ maxWidth: ehComissao || ehFaixaUnidade ? 960 : 640 }}>
                <TextField label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
                <TextField
                  label="Descrição"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  multiline
                  minRows={3}
                />
                <FormControl>
                  <Stack direction="row" spacing={0.5} sx={{ mb: 1, alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Tipo de indicador
                    </Typography>
                    <CampoHelp ariaLabel="O que cada tipo de indicador faz">
                      <TipoIndicadorHelp tipo={tipoIndicador(chartTipo)} />
                    </CampoHelp>
                  </Stack>
                  <RadioGroup
                    value={tipoIndicador(chartTipo)}
                    onChange={(e) => {
                      if (e.target.value === 'marco') {
                        setChartTipo('marco')
                        setUnidade('marco')
                        setValorMeta('1')
                        setSentido('maior_melhor')
                        setModoBonus('fixo')
                        return
                      }
                      if (e.target.value === 'comissao') {
                        setChartTipo('comissao')
                        setUnidade('R$')
                        setSentido('maior_melhor')
                        setTipoEscopo((atual) => (atual === 'cargo' || atual === 'individual' ? atual : 'cargo'))
                        setModoBonus('fixo')
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
                  <FormControl sx={{ minWidth: 0, flex: 1 }}>
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
                    <FormControl sx={{ minWidth: 0, flex: 1 }}>
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
                          sx={{ minWidth: 0, flex: 1 }}
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
                        <RadioGroup
                          row
                          value={sentido}
                          onChange={(e) => {
                            const next = e.target.value as Sentido
                            setSentido(next)
                            if (next === 'menor_melhor') {
                              setModoBonus('fixo')
                            }
                          }}
                        >
                          <FormControlLabel value="maior_melhor" control={<Radio />} label="Maior é melhor" />
                          <FormControlLabel value="menor_melhor" control={<Radio />} label="Menor é melhor" />
                        </RadioGroup>
                      </FormControl>
                    </>
                  )
                )}
                {!ehComissao && modoBonus !== 'faixa_unidade' && (
                  <TextField
                    label={modoBonus === 'por_unidade' ? 'Valor por unidade' : 'Valor do bônus'}
                    type="number"
                    value={valorBonus}
                    onChange={(e) => setValorBonus(e.target.value)}
                    helperText={
                      ehQuantitativa && modoBonus === 'linear' && sentido === 'maior_melhor'
                        ? 'Valor pago ao atingir 100% do alvo. Acima do piso, o pagamento cresce na mesma proporção.'
                        : ehQuantitativa && modoBonus === 'unidade' && sentido === 'maior_melhor'
                          ? 'Valor pago ao bater o alvo. Cada unidade extra usa o campo abaixo.'
                          : ehQuantitativa && modoBonus === 'por_unidade' && sentido === 'maior_melhor'
                            ? 'Pago por cada unidade realizada, desde a primeira. Ex.: 3 contratos × R$ 50 = R$ 150.'
                            : 'Pago no fechamento do mês quando a meta é batida. Não aparece no painel.'
                    }
                  />
                )}
                {ehQuantitativa && sentido === 'maior_melhor' && (
                  <>
                    <FormControl>
                      <Stack direction="row" spacing={0.5} sx={{ mb: 1, alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Como o bônus é pago
                        </Typography>
                        <CampoHelp ariaLabel="Como o bônus é calculado">
                          <BonusModoHelp
                            modo={modoBonus}
                            valorBonus={valorBonus}
                            valorMeta={valorMeta}
                            bonusPiso={bonusPiso}
                            bonusTeto={bonusTeto}
                            bonusPorUnidade={bonusPorUnidade}
                          />
                        </CampoHelp>
                      </Stack>
                      <RadioGroup
                        value={modoBonus}
                        onChange={(_, value) => {
                          const next = value as ModoBonus
                          setModoBonus(next)
                          if (next === 'faixa_unidade' && faixas.length === 0) {
                            setFaixas(TABELA_SDR_REUNIOES)
                          }
                        }}
                      >
                        <FormControlLabel
                          value="fixo"
                          control={<Radio />}
                          label="Fixo: bateu o alvo, recebe o valor inteiro"
                        />
                        <FormControlLabel
                          value="linear"
                          control={<Radio />}
                          label="Proporcional: a partir do piso, o valor acompanha o atingimento"
                        />
                        <FormControlLabel
                          value="unidade"
                          control={<Radio />}
                          label="Por unidade extra: bateu o alvo e cada unidade a mais paga a mais"
                        />
                        <FormControlLabel
                          value="faixa_unidade"
                          control={<Radio />}
                          label="Por faixas: a quantidade define a taxa, aplicada no total do mês"
                        />
                        <FormControlLabel
                          value="por_unidade"
                          control={<Radio />}
                          label="Por unidade: cada unidade paga o valor, desde a primeira"
                        />
                      </RadioGroup>
                    </FormControl>
                    {modoBonus === 'linear' && (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="Piso para pagar (%)"
                          type="number"
                          value={bonusPiso}
                          onChange={(e) => setBonusPiso(e.target.value)}
                          helperText="Abaixo disso, o bônus é zero."
                        />
                        <TextField
                          label="Teto do pagamento (%)"
                          type="number"
                          value={bonusTeto}
                          onChange={(e) => setBonusTeto(e.target.value)}
                          helperText="Vazio = sem teto no dinheiro."
                        />
                      </Stack>
                    )}
                    {modoBonus === 'unidade' && (
                      <TextField
                        label="Bônus por unidade extra"
                        type="number"
                        value={bonusPorUnidade}
                        onChange={(e) => setBonusPorUnidade(e.target.value)}
                        helperText="Somado ao bônus-base para cada unidade acima do alvo."
                      />
                    )}
                    {modoBonus === 'faixa_unidade' && (
                      <Stack spacing={1.5}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Faixas de quantidade
                          </Typography>
                          <Button size="small" onClick={() => setFaixas(TABELA_SDR_REUNIOES)}>
                            Usar tabela SDR (reuniões)
                          </Button>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          A maior faixa atingida define a taxa. O pagamento é realizado × R$ da faixa, sobre o total — não só o excedente.
                        </Typography>
                        {faixas.map((faixa, indice) => (
                          <Stack key={`${faixa.nome}-${indice}`} direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' } }}>
                            <TextField
                              label="Nome"
                              value={faixa.nome}
                              onChange={(e) => {
                                const copia = [...faixas]
                                copia[indice] = { ...copia[indice], nome: e.target.value }
                                setFaixas(copia)
                              }}
                              sx={{ minWidth: 0, flex: 1 }}
                            />
                            <TextField
                              label="Quantidade mín."
                              type="number"
                              value={faixa.quantidade_min}
                              onChange={(e) => {
                                const copia = [...faixas]
                                copia[indice] = { ...copia[indice], quantidade_min: Number(e.target.value) }
                                setFaixas(copia)
                              }}
                              sx={{ flex: 1 }}
                            />
                            <TextField
                              label="R$ por unidade"
                              type="number"
                              value={faixa.valor_por_unidade}
                              onChange={(e) => {
                                const copia = [...faixas]
                                copia[indice] = { ...copia[indice], valor_por_unidade: Number(e.target.value) }
                                setFaixas(copia)
                              }}
                              sx={{ flex: 1 }}
                            />
                            <IconButton
                              aria-label="Remover faixa"
                              onClick={() => setFaixas(faixas.filter((_, i) => i !== indice))}
                              disabled={faixas.length <= 1}
                            >
                              <DeleteOutlinedIcon />
                            </IconButton>
                          </Stack>
                        ))}
                        <Button
                          startIcon={<AddIcon />}
                          onClick={() => setFaixas([...faixas, faixaEmBranco(faixas.length + 1)])}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          Adicionar faixa
                        </Button>
                      </Stack>
                    )}
                  </>
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
                {mostrarPorPessoa && (
                  <FormControl>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                      {chartTipo === 'marco' ? 'Como o marco é concluído' : 'Como o valor é lançado'}
                    </Typography>
                    <RadioGroup
                      value={porPessoa ? 'por_pessoa' : 'compartilhado'}
                      onChange={(_, value) => setPorPessoa(value === 'por_pessoa')}
                    >
                      <FormControlLabel
                        value="compartilhado"
                        control={<Radio />}
                        label={
                          chartTipo === 'marco'
                            ? 'Um marco compartilhado: quem disparar marca para o grupo'
                            : 'Um valor geral: quem lançar registra para o grupo'
                        }
                      />
                      <FormControlLabel
                        value="por_pessoa"
                        control={<Radio />}
                        label={
                          chartTipo === 'marco'
                            ? 'Cada pessoa conclui o próprio marco'
                            : 'Cada pessoa tem o próprio valor'
                        }
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
                    {mostrarPorPessoa && porPessoa
                      ? 'O painel lista feito ou pendente por pessoa. O marco só fica concluído quando todas concluírem.'
                      : 'O painel mostra só se o marco foi concluído ou ainda está pendente.'}
                  </Alert>
                ) : ehComissao ? (
                  <Alert severity="info">
                    O painel mostra a faixa atingida, a comissão, o prêmio e o total da remuneração variável.
                  </Alert>
                ) : (
                  <>
                    {mostrarPorPessoa && porPessoa ? (
                      <Alert severity="info">
                        Cada pessoa lança o próprio valor. O alvo vale para cada um. No fechamento entra quem tiver direito ao bônus da regra cadastrada.
                      </Alert>
                    ) : (
                      chartTipo === 'column' &&
                      (tipoEscopo === 'global' || deptsSel.length > 1) && (
                        <Alert severity="info">
                          Cada líder lançará a barra do próprio setor. A Direção pode lançar qualquer setor.
                        </Alert>
                      )
                    )}
                    <ToggleButtonGroup exclusive value={chartTipo} onChange={(_, v) => v && setChartTipo(v)} sx={{ flexWrap: 'wrap' }}>
                      <ToggleButton value="gauge">Velocímetro</ToggleButton>
                      <ToggleButton value="progress_bar">Barra de progresso</ToggleButton>
                      <ToggleButton value="line">Linha temporal</ToggleButton>
                      <ToggleButton value="column">Barras comparativas</ToggleButton>
                    </ToggleButtonGroup>
                  </>
                )}
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
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
                <Button variant="contained" onClick={() => mutation.mutate(payload())} disabled={mutation.isPending}>
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
