import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import type { MetaLancavel } from '../types'

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
    if (selected?.chart_tipo === 'marco') {
      setValor(selected.valor_realizado && selected.valor_realizado > 0 ? '1' : '0')
    }
  }, [selected])

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
      setValor('')
      setValorAdesao('')
      setObservacao('')
      onClose()
    },
    onError: () => setError('Não foi possível salvar. Verifique os dados e a permissão.'),
  })

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 }, p: 3, border: 'none', boxShadow: '-12px 0 32px rgba(10,17,40,0.12)' } } }}
    >
      <Typography variant="h6">Registrar resultado</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Informe o resultado na competência em aberto. Só aparecem metas que você pode registrar.
      </Typography>
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
      <Stack spacing={2.5}>
        <FormControl fullWidth>
          <InputLabel>Meta</InputLabel>
          <Select label="Meta" value={metaId} onChange={(e) => setMetaId(Number(e.target.value))}>
            {(data ?? []).map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.titulo}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {(selected?.comparativa || selected?.por_grao || selected?.chart_tipo === 'comissao') && selected.graos.length > 0 && (
          <FormControl fullWidth>
            <InputLabel>{selected.chart_tipo === 'comissao' ? 'Vendedor' : 'Alvo'}</InputLabel>
            <Select
              label={selected.chart_tipo === 'comissao' ? 'Vendedor' : 'Alvo'}
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
            control={<Switch checked={valor === '1'} onChange={(e) => setValor(e.target.checked ? '1' : '0')} />}
            label={valor === '1' ? 'Marco concluído' : 'Marco pendente'}
          />
        ) : selected?.chart_tipo === 'comissao' ? (
          <>
            <TextField
              label="Valor total vendido (receita recorrente)"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
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
            onChange={(e) => setValor(e.target.value)}
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
