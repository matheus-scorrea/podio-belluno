import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { AppShell } from '../layout/AppShell'
import type { Departamento } from '../types'

type CargoLinha = {
  key: string
  id?: number
  nome: string
  ativo: boolean
  lider: boolean
}

function novaLinha(): CargoLinha {
  return { key: crypto.randomUUID(), nome: '', ativo: true, lider: false }
}

export function DepartamentoFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [nome, setNome] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [cargos, setCargos] = useState<CargoLinha[]>([novaLinha()])
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(!isEdit)
  const [cargoParaRemover, setCargoParaRemover] = useState<CargoLinha | null>(null)

  const { data: departamento, isLoading } = useQuery({
    queryKey: ['departamento', id],
    queryFn: async () => (await api.get(`/departamentos/${id}`)).data as Departamento,
    enabled: isEdit,
  })

  useEffect(() => {
    if (!departamento) {
      return
    }
    setNome(departamento.nome)
    setAtivo(departamento.ativo)
    const linhas = (departamento.cargos ?? []).map((c) => ({
      key: String(c.id),
      id: c.id,
      nome: c.nome,
      ativo: c.ativo,
      lider: c.id === departamento.cargo_lider_id,
    }))
    setCargos(linhas.length > 0 ? linhas : [novaLinha()])
    setHydrated(true)
  }, [departamento])

  function atualizarCargo(key: string, patch: Partial<CargoLinha>) {
    setCargos((atual) =>
      atual.map((c) => {
        if (c.key !== key) {
          if (patch.lider) {
            return { ...c, lider: false }
          }
          return c
        }
        return { ...c, ...patch }
      }),
    )
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome,
        ativo,
        cargos: cargos
          .filter((c) => c.nome.trim())
          .map((c) => ({
            id: c.id,
            nome: c.nome.trim(),
            ativo: c.ativo,
            lider: c.lider && c.ativo,
          })),
      }
      if (isEdit && id) {
        await api.put(`/departamentos/${id}`, payload)
        return
      }
      await api.post('/departamentos', payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['departamentos'] }),
        queryClient.invalidateQueries({ queryKey: ['departamento'] }),
        queryClient.invalidateQueries({ queryKey: ['cargos'] }),
      ])
      navigate('/departamentos')
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      setError(data?.errors?.cargos?.[0] ?? data?.message ?? 'Não foi possível salvar o setor. Verifique os campos.')
    },
  })

  const removerCargo = useMutation({
    mutationFn: async (linha: CargoLinha) => {
      if (linha.id) {
        await api.delete(`/cargos/${linha.id}`)
      }
      return linha.key
    },
    onSuccess: async (key) => {
      setCargos((atual) => {
        const resto = atual.filter((c) => c.key !== key)
        return resto.length > 0 ? resto : [novaLinha()]
      })
      setCargoParaRemover(null)
      setError(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['departamentos'] }),
        queryClient.invalidateQueries({ queryKey: ['departamento'] }),
        queryClient.invalidateQueries({ queryKey: ['cargos'] }),
      ])
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      setError(data?.errors?.cargo?.[0] ?? data?.message ?? 'Não foi possível remover o cargo.')
      setCargoParaRemover(null)
    },
  })

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell ano={2026} mes={9}>
      <PageHeader
        title={isEdit ? 'Editar setor' : 'Novo setor'}
        subtitle="O setor reúne os cargos. Marque um cargo ativo como líder — é quem registra o resultado da área."
        backTo={{ href: '/departamentos', label: 'Voltar para setores' }}
      />
      <Paper sx={{ p: { xs: 2, md: 3.5 } }}>
        {isEdit && (!hydrated || isLoading) ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, maxWidth: 720 }}>
                <TextField label="Nome do setor" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus sx={{ flex: 1 }} />
                <FormControlLabel
                  control={<Switch checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />}
                  label={ativo ? 'Setor ativo' : 'Setor inativo'}
                />
              </Stack>
              {!ativo && (
                <Alert severity="info">
                  Setor inativo some do painel e das listas de atribuição. Os cadastros e o histórico permanecem.
                </Alert>
              )}
              <Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Cargos do setor
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Inative um cargo para tirá-lo das novas atribuições. Exclua só se ninguém estiver vinculado a ele.
                    </Typography>
                  </Box>
                  <Button startIcon={<AddIcon />} onClick={() => setCargos((atual) => [...atual, novaLinha()])}>
                    Adicionar cargo
                  </Button>
                </Stack>
                <Paper variant="outlined" sx={{ overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell width={120}>Ativo</TableCell>
                        <TableCell width={140}>Líder do setor</TableCell>
                        <TableCell width={56} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cargos.map((c) => (
                        <TableRow key={c.key}>
                          <TableCell>
                            <TextField
                              placeholder="Ex.: Coordenador de CS"
                              value={c.nome}
                              onChange={(e) => atualizarCargo(c.key, { nome: e.target.value })}
                              size="small"
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={c.ativo}
                              onChange={(e) =>
                                atualizarCargo(c.key, {
                                  ativo: e.target.checked,
                                  lider: e.target.checked ? c.lider : false,
                                })
                              }
                              slotProps={{ input: { 'aria-label': `Cargo ${c.nome || 'novo'} ativo` } }}
                            />
                          </TableCell>
                          <TableCell>
                            <Radio
                              checked={c.lider}
                              disabled={!c.ativo}
                              onChange={() => atualizarCargo(c.key, { lider: true })}
                              slotProps={{ input: { 'aria-label': `Definir ${c.nome || 'cargo'} como líder` } }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Remover cargo">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setError(null)
                                  setCargoParaRemover(c)
                                }}
                                aria-label="Remover cargo"
                              >
                                <DeleteOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>
            </Stack>
            {error && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}
            <Divider sx={{ mt: 4, mb: 2.5 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/departamentos')}>
                Voltar para setores
              </Button>
              <Button variant="contained" onClick={() => mutation.mutate()} disabled={!nome.trim() || mutation.isPending}>
                {isEdit ? 'Salvar alterações' : 'Cadastrar setor'}
              </Button>
            </Stack>
          </>
        )}
      </Paper>
      <Dialog open={Boolean(cargoParaRemover)} onClose={() => !removerCargo.isPending && setCargoParaRemover(null)}>
        <DialogTitle>Excluir cargo?</DialogTitle>
        <DialogContent>
          <Typography>
            {cargoParaRemover?.id
              ? `O cargo “${cargoParaRemover.nome || 'sem nome'}” será removido deste setor. Se houver pessoas ou metas vinculadas, inative em vez de excluir.`
              : 'Esta linha ainda não foi salva e só sai do formulário.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCargoParaRemover(null)} disabled={removerCargo.isPending}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={!cargoParaRemover || removerCargo.isPending}
            onClick={() => cargoParaRemover && removerCargo.mutate(cargoParaRemover)}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  )
}
