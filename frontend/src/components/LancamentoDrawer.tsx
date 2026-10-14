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
import type { MetaLancavel } from '../types'

const PIN_KEY = 'podio.lancamento.fixar'

function lerPin(): boolean {
  try {
    return localStorage.getItem(PIN_KEY) === '1'
  } catch {
    return false
  }
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
    }
  }, [open])

  const { data, isLoading } = useQuery({
    queryKey: ['lancaveis', ano, mes],
    queryFn: async () => (await api.get(`/metas/lancaveis?ano=${ano}&mes=${mes}`)).data.data as MetaLancavel[],
    enabled: open,
  })

  const selected = data?.find((m) => m.id === metaId)

  useEffect(() => {
    if (open && data && data.length > 0 && metaId === '') {
      setMetaId(data[0].id)
    }
  }, [open, data, metaId])

  useEffect(() => {
    if (selected?.graos[0]) {
      const g = selected.graos[0]
      setGraoKey(`${g.departamento_id}-${g.cargo_id}-${g.usuario_alvo_id}`)
    }
  }, [selected])

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
        const grao = selected.graos.find((g) => `${g.departamento_id}-${g.cargo_id}-${g.usuario_alvo_id}` === graoKey)
        setValor((grao?.valor_realizado ?? 0) >= 1 ? '1' : '0')
        return
      }
      setValor(selected.valor_realizado && selected.valor_realizado > 0 ? '1' : '0')
      return
    }
    if (selected.por_grao && selected.chart_tipo !== 'comissao') {
      const grao = selected.graos.find((g) => `${g.departamento_id}-${g.cargo_id}-${g.usuario_alvo_id}` === graoKey)
      const atual = grao?.valor_realizado
      setValor(atual != null && atual !== 0 ? String(atual) : '')
    }
  }, [selected, graoKey])

  const mutation = useMutation({
    mutationFn: async () => {
      const grao = selected?.graos.find((g) => `${g.departamento_id}-${g.cargo_id}-${g.usuario_alvo_id}` === graoKey)
      await api.post(`/metas/${metaId}/lancamentos`, {
        valor_realizado: Number(valor),
        valor_adesao: selected?.chart_tipo === 'comissao' ? Number(valorAdesao) : undefined,
        data_evento: dataEvento.format('YYYY-MM-DD'),
        observacao: observacao || null,
        departamento_id: grao?.departamento_id,
        cargo_id: grao?.cargo_id,
        usuario_alvo_id: grao?.usuario_alvo_id,
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
      const data = (err as { response?: { data?: { message?: string; errors?: { data_evento?: string[] } } } }).response?.data
      setError(data?.errors?.data_evento?.[0] ?? data?.message ?? 'Não foi possível salvar. Verifique os dados e a permissão.')
    },
  })

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
            Informe o resultado na competência em aberto. Só aparecem metas que você pode registrar.
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
      {isLoading && <CircularProgress size={24} />}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Não há metas para registrar nesta competência.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {salvo && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Resultado registrado. Escolha outra meta para continuar.
        </Alert>
      )}
      <Stack spacing={2.5}>
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
        {(selected?.comparativa || selected?.por_grao || selected?.chart_tipo === 'comissao') && selected.graos.length > 0 && (
          <FormControl fullWidth>
            <InputLabel>
              {selected.chart_tipo === 'comissao'
                ? 'Vendedor'
                : selected.por_grao && selected.graos.some((g) => g.usuario_alvo_id)
                  ? 'Pessoa'
                  : 'Alvo'}
            </InputLabel>
            <Select
              label={
                selected.chart_tipo === 'comissao'
                  ? 'Vendedor'
                  : selected.por_grao && selected.graos.some((g) => g.usuario_alvo_id)
                    ? 'Pessoa'
                    : 'Alvo'
              }
              value={graoKey}
              onChange={(e) => setGraoKey(String(e.target.value))}
              disabled={!user?.is_direcao && selected.graos.length === 1}
            >
              {selected.graos.map((g) => (
                <MenuItem
                  key={`${g.departamento_id}-${g.cargo_id}-${g.usuario_alvo_id}`}
                  value={`${g.departamento_id}-${g.cargo_id}-${g.usuario_alvo_id}`}
                >
                  {g.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
              onChange={(e) => setValorAdesao(e.target.value)}
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
        <DatePicker label="Data do evento" value={dataEvento} onChange={(v) => v && setDataEvento(v)} />
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
            disabled={(selected?.chart_tipo !== 'marco' && !valor) || (selected?.chart_tipo === 'comissao' && !valorAdesao) || !metaId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Salvar
          </Button>
        </Box>
      </Stack>
    </Drawer>
  )
}
