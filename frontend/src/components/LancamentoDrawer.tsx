import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { competenciaAbertaParaLancamento, competenciaLabel, competenciasParaLancamento } from '../lib/labels'
import type { MetaLancavel } from '../types'

const PIN_KEY = 'podio.lancamento.fixar'
const GRAOS_VAZIOS: MetaLancavel['graos'] = []

function lerPin(): boolean {
  try {
    return localStorage.getItem(PIN_KEY) === '1'
  } catch {
    return false
  }
}

function chaveGrao(g: { departamento_id: number | null; cargo_id: number | null; usuario_alvo_id: number | null }): string {
  return `${g.departamento_id ?? ''}-${g.cargo_id ?? ''}-${g.usuario_alvo_id ?? ''}`
}

function mensagemErroLancamento(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data
  const first = data?.errors ? Object.values(data.errors).flat().find((item) => typeof item === 'string') : undefined
  if (first) {
    return first
  }

  return data?.message ?? 'Não foi possível salvar. Verifique os dados e a permissão.'
}

type Props = {
  open: boolean
  onClose: () => void
  ano: number
  mes: number
}

export function LancamentoDrawer({ open, onClose, ano, mes }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [compAno, setCompAno] = useState(ano)
  const [compMes, setCompMes] = useState(mes)
  const isDirecao = user?.is_direcao === true
  const competencias = (() => {
    const lista = competenciasParaLancamento(isDirecao)
    if (lista.some((c) => c.ano === compAno && c.mes === compMes)) {
      return lista
    }
    return [{ ano: compAno, mes: compMes, label: competenciaLabel(compMes, compAno) }, ...lista]
  })()
  const encerrada = !competenciaAbertaParaLancamento(compAno, compMes, isDirecao)
  const inicioMes = dayjs(`${compAno}-${String(compMes).padStart(2, '0')}-01`)
  const fimMes = inicioMes.endOf('month')
  const [metaId, setMetaId] = useState<number | ''>('')
  const [graoKey, setGraoKey] = useState('')
  const [valor, setValor] = useState('')
  const [valorAdesao, setValorAdesao] = useState('')
  const [dataEvento, setDataEvento] = useState<Dayjs>(dayjs(`${ano}-${String(mes).padStart(2, '0')}-09`))
  const [observacao, setObservacao] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fixado, setFixado] = useState(lerPin)
  const [salvo, setSalvo] = useState(false)
  const pularPreenchimento = useRef(false)

  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, fixado ? '1' : '0')
    } catch {
      // armazenamento indisponível
    }
  }, [fixado])

  useEffect(() => {
    if (!open) {
      setSalvo(false)
      return
    }
    setCompAno(ano)
    setCompMes(mes)
    setMetaId('')
  }, [open, ano, mes])

  useEffect(() => {
    setDataEvento((atual) => {
      if (atual.year() === compAno && atual.month() + 1 === compMes) {
        return atual
      }
      const agora = dayjs()
      if (agora.year() === compAno && agora.month() + 1 === compMes) {
        return agora
      }
      return dayjs(`${compAno}-${String(compMes).padStart(2, '0')}-01`)
    })
  }, [compAno, compMes])

  const { data, isLoading } = useQuery({
    queryKey: ['lancaveis', compAno, compMes],
    queryFn: async () => (await api.get(`/metas/lancaveis?ano=${compAno}&mes=${compMes}`)).data.data as MetaLancavel[],
    enabled: open && !encerrada,
  })

  const selected = data?.find((m) => m.id === metaId)
  const graos = selected?.graos ?? GRAOS_VAZIOS
  const grao = graos.find((g) => chaveGrao(g) === graoKey)
    ?? graos.find((g) => g.usuario_alvo_id === user?.id)
    ?? graos[0]
    ?? null
  const graoValue = grao ? chaveGrao(grao) : ''
  const precisaPessoa = Boolean(selected?.por_grao || selected?.comparativa)

  useEffect(() => {
    if (open && data && data.length > 0 && metaId === '') {
      setMetaId(data[0].id)
    }
  }, [open, data, metaId])

  useEffect(() => {
    if (!graos.length) {
      setGraoKey('')
      return
    }
    setGraoKey((prev) => {
      if (graos.some((g) => chaveGrao(g) === prev)) {
        return prev
      }
      const eu = graos.find((g) => g.usuario_alvo_id === user?.id)

      return chaveGrao(eu ?? graos[0])
    })
  }, [graos, user?.id])

  useEffect(() => {
    if (!selected) {
      return
    }
    if (pularPreenchimento.current) {
      pularPreenchimento.current = false
      return
    }
    if (selected.chart_tipo === 'marco') {
      if (selected.por_grao) {
        setValor((grao?.valor_realizado ?? 0) >= 1 ? '1' : '0')
        return
      }
      setValor(selected.valor_realizado && selected.valor_realizado > 0 ? '1' : '0')
      return
    }
    if (selected.chart_tipo === 'comissao') {
      const atual = grao?.valor_realizado ?? (selected.por_grao ? undefined : selected.valor_realizado)
      const adesao = grao?.valor_adesao
      setValor(atual != null && atual !== 0 ? String(atual) : '')
      setValorAdesao(adesao != null && adesao !== 0 ? String(adesao) : '')
      return
    }
    if (selected.por_grao) {
      const atual = grao?.valor_realizado
      setValor(atual != null && atual !== 0 ? String(atual) : '')
    }
  }, [selected, graoKey, grao])

  const mutation = useMutation({
    mutationFn: async () => {
      if (precisaPessoa && !grao) {
        throw { response: { data: { message: 'Selecione a pessoa deste lançamento.' } } }
      }
      await api.post(`/metas/${metaId}/lancamentos`, {
        valor_realizado: Number(valor),
        valor_adesao: selected?.chart_tipo === 'comissao' ? Number(valorAdesao) : undefined,
        data_evento: dataEvento.format('YYYY-MM-DD'),
        observacao: observacao || null,
        departamento_id: grao?.departamento_id ?? undefined,
        cargo_id: grao?.cargo_id ?? undefined,
        usuario_alvo_id: grao?.usuario_alvo_id ?? (!user?.is_direcao && !user?.is_lider ? user?.id : undefined),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['lancaveis'] })
      pularPreenchimento.current = true
      setValor('')
      setValorAdesao('')
      setObservacao('')
      setError(null)
      if (fixado) {
        setSalvo(true)
        return
      }
      onClose()
    },
    onError: (err: unknown) => {
      setError(mensagemErroLancamento(err))
    },
  })

  const salvarDesabilitado = (selected?.chart_tipo !== 'marco' && !valor)
    || (selected?.chart_tipo === 'comissao' && !valorAdesao)
    || !metaId
    || mutation.isPending
    || (precisaPessoa && !grao)

  const rotuloAlvo = selected?.chart_tipo === 'comissao'
    ? 'Vendedor'
    : selected?.por_grao && graos.some((g) => g.usuario_alvo_id)
      ? 'Pessoa'
      : 'Alvo'

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 420 },
            p: 3,
            pt: 'max(24px, env(safe-area-inset-top))',
            pb: 'max(24px, env(safe-area-inset-bottom))',
            pl: 'max(24px, env(safe-area-inset-left))',
            pr: 'max(24px, env(safe-area-inset-right))',
            border: 'none',
            boxShadow: '-12px 0 32px rgba(10,17,40,0.12)',
          },
        },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography variant="h6">Registrar resultado</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Informe o resultado na competência aberta. Só aparecem metas que você pode registrar neste mês.
          </Typography>
        </Box>
        <Tooltip title={fixado ? 'Soltar painel' : 'Fixar painel'}>
          <IconButton
            aria-label={fixado ? 'Soltar painel' : 'Fixar painel'}
            aria-pressed={fixado}
            color={fixado ? 'primary' : 'default'}
            onClick={() => setFixado((atual) => !atual)}
          >
            {fixado ? <PushPinIcon /> : <PushPinOutlinedIcon />}
          </IconButton>
        </Tooltip>
      </Stack>
      <FormControl fullWidth sx={{ mb: 2.5 }}>
        <InputLabel>Competência</InputLabel>
        <Select
          label="Competência"
          value={`${compMes}/${compAno}`}
          onChange={(e) => {
            const [m, a] = String(e.target.value).split('/')
            setCompMes(Number(m))
            setCompAno(Number(a))
            setMetaId('')
            setSalvo(false)
            setError(null)
          }}
        >
          {competencias.map((c) => (
            <MenuItem key={`${c.mes}/${c.ano}`} value={`${c.mes}/${c.ano}`}>
              {c.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {isLoading && <CircularProgress size={24} />}
      {encerrada && (
        <Alert severity="info">
          {competenciaLabel(compMes, compAno)} já fechou. Fora do mês atual, o lançamento vale só até o dia 7.
        </Alert>
      )}
      {!encerrada && !isLoading && (data?.length ?? 0) === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Não há metas para registrar em {competenciaLabel(compMes, compAno)}. Troque a competência acima se o lançamento for de outro mês.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {salvo && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Resultado registrado. Escolha outra meta ou pessoa para continuar.
        </Alert>
      )}
      {!encerrada && <Stack spacing={2.5}>
        <FormControl fullWidth>
          <InputLabel>Meta</InputLabel>
          <Select
            label="Meta"
            value={metaId}
            onChange={(e) => {
              setSalvo(false)
              setMetaId(Number(e.target.value))
            }}
          >
            {(data ?? []).map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.titulo}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {precisaPessoa && graos.length > 0 && (
          <FormControl fullWidth>
            <InputLabel>{rotuloAlvo}</InputLabel>
            <Select
              label={rotuloAlvo}
              value={graoValue}
              onChange={(e) => setGraoKey(String(e.target.value))}
              disabled={!user?.is_direcao && graos.length === 1}
            >
              {graos.map((g) => (
                <MenuItem
                  key={chaveGrao(g)}
                  value={chaveGrao(g)}
                >
                  {g.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {precisaPessoa && selected && graos.length === 0 && (
          <Alert severity="warning">
            Esta meta mede cada pessoa, mas não há ninguém no escopo para registrar agora.
          </Alert>
        )}
        {selected?.chart_tipo === 'marco' ? (
          <FormControlLabel
            control={
              <Switch
                checked={valor === '1'}
                onChange={(e) => {
                  setSalvo(false)
                  setValor(e.target.checked ? '1' : '0')
                }}
              />
            }
            label={valor === '1' ? 'Marco concluído' : 'Marco pendente'}
          />
        ) : selected?.chart_tipo === 'comissao' ? (
          <>
            <TextField
              label="Valor total vendido (receita recorrente)"
              value={valor}
              onChange={(e) => {
                setSalvo(false)
                setValor(e.target.value)
              }}
              type="number"
              variant="filled"
              slotProps={{ input: { sx: { fontSize: 28, color: 'primary.main', fontVariantNumeric: 'tabular-nums' } } }}
            />
            <TextField
              label="Valor recebido em adesão"
              value={valorAdesao}
              onChange={(e) => {
                setSalvo(false)
                setValorAdesao(e.target.value)
              }}
              type="number"
              variant="filled"
              slotProps={{ input: { sx: { fontSize: 28, color: 'primary.main', fontVariantNumeric: 'tabular-nums' } } }}
            />
          </>
        ) : (
          <TextField
            label="Valor realizado"
            value={valor}
            onChange={(e) => {
              setSalvo(false)
              setValor(e.target.value)
            }}
            type="number"
            variant="filled"
            slotProps={{ input: { sx: { fontSize: 32, color: 'primary.main', fontVariantNumeric: 'tabular-nums' } } }}
          />
        )}
        <DatePicker
          label="Data do evento"
          value={dataEvento}
          minDate={inicioMes}
          maxDate={fimMes}
          onChange={(v) => v && setDataEvento(v)}
        />
        <TextField
          label="Justificativa / observação"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          multiline
          minRows={3}
        />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={salvarDesabilitado}
            onClick={() => mutation.mutate()}
          >
            Salvar
          </Button>
        </Box>
      </Stack>}
    </Drawer>
  )
}
