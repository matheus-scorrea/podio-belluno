import AddIcon from '@mui/icons-material/Add'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Skeleton,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { hideColXs, ResponsiveTable } from '../components/ResponsiveTable'
import { AppShell } from '../layout/AppShell'
import { competenciaVigente } from '../lib/labels'
import type { Variavel, VariavelStatus } from '../types'

type Acao = 'inativar' | 'reativar' | 'excluir'

function erroApi(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
  return data?.errors?.variavel?.[0] ?? data?.errors?.consulta_sql?.[0] ?? data?.message ?? 'Não foi possível concluir a ação.'
}

function statusLabel(status: VariavelStatus, erro?: string | null): string {
  if (erro) {
    return 'Com erro'
  }
  if (status === 'publicada') {
    return 'Publicada'
  }
  if (status === 'inativa') {
    return 'Inativa'
  }
  return 'Rascunho'
}

export function IndicadoresPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { ano, mes } = competenciaVigente()
  const [alvo, setAlvo] = useState<{ item: Variavel; acao: Acao } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [syncOk, setSyncOk] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['variaveis'],
    queryFn: async () => (await api.get('/variaveis')).data.data as Variavel[],
  })

  const acao = useMutation({
    mutationFn: async ({ item, acao: tipo }: { item: Variavel; acao: Acao }) => {
      if (tipo === 'excluir') {
        await api.delete(`/variaveis/${item.id}`)
        return
      }
      await api.post(`/variaveis/${item.id}/${tipo}`)
    },
    onSuccess: async () => {
      setAlvo(null)
      setErro(null)
      await queryClient.invalidateQueries({ queryKey: ['variaveis'] })
    },
    onError: (err) => setErro(erroApi(err)),
  })

  const sync = useMutation({
    mutationFn: async () => (await api.post('/variaveis/sincronizar')).data as { ok: number; erro: number },
    onSuccess: async (resultado) => {
      setErro(null)
      setSyncOk(`Sincronização: ${resultado.ok} ok, ${resultado.erro} com erro.`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['variaveis'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['metas'] }),
      ])
    },
    onError: (err) => {
      setSyncOk(null)
      setErro(erroApi(err))
    },
  })

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell ano={ano} mes={mes}>
      <PageHeader
        title="Indicadores"
        subtitle="Variáveis globais extraídas do data warehouse. Quem cadastra a meta só escolhe a variável publicada."
        actions={
          <>
            <Button variant="outlined" onClick={() => navigate('/indicadores/conexoes')}>
              Conexões
            </Button>
            <Button variant="outlined" startIcon={<SyncOutlinedIcon />} onClick={() => sync.mutate()} disabled={sync.isPending}>
              Sincronizar agora
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/indicadores/nova')}>
              Nova variável
            </Button>
          </>
        }
      />
      {erro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}
      {syncOk && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSyncOk(null)}>
          {syncOk}
        </Alert>
      )}
      <Paper sx={{ overflow: 'hidden' }}>
        <ResponsiveTable>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell sx={hideColXs}>Chave</TableCell>
              <TableCell sx={hideColXs}>Conexão</TableCell>
              <TableCell>Unidade</TableCell>
              <TableCell>Valor do mês</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={`sk-${idx}`}>
                    <TableCell colSpan={7}>
                    <Skeleton height={36} />
                  </TableCell>
                </TableRow>
              ))}
            {(data ?? []).map((item) => (
              <TableRow key={item.id} hover sx={{ opacity: item.status === 'inativa' ? 0.7 : 1 }}>
                <TableCell sx={{ fontWeight: 600 }}>{item.nome}</TableCell>
                <TableCell sx={hideColXs}>
                  <Typography variant="body2" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                    {item.chave}
                  </Typography>
                </TableCell>
                <TableCell sx={hideColXs}>{item.conexao?.nome ?? '—'}</TableCell>
                <TableCell>{item.unidade}</TableCell>
                <TableCell>{item.valor_vigente == null ? '—' : item.valor_vigente}</TableCell>
                <TableCell>
                  <Chip size="small" label={statusLabel(item.status ?? 'rascunho', item.ultimo_erro)} color={item.ultimo_erro ? 'error' : item.status === 'publicada' ? 'success' : 'default'} />
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="Editar">
                    <IconButton color="primary" onClick={() => navigate(`/indicadores/${item.id}/editar`)} aria-label="Editar variável">
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={item.status === 'inativa' ? 'Reativar' : 'Inativar'}>
                    <IconButton
                      color={item.status === 'inativa' ? 'success' : 'warning'}
                      onClick={() => {
                        setErro(null)
                        setAlvo({ item, acao: item.status === 'inativa' ? 'reativar' : 'inativar' })
                      }}
                      aria-label={item.status === 'inativa' ? 'Reativar variável' : 'Inativar variável'}
                    >
                      {item.status === 'inativa' ? <CheckCircleOutlinedIcon fontSize="small" /> : <BlockOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={(item.metas_count ?? 0) > 0 ? 'Em uso em uma meta. Inative em vez de excluir.' : 'Excluir'}>
                    <span>
                      <IconButton
                        color="error"
                        disabled={(item.metas_count ?? 0) > 0}
                        onClick={() => {
                          setErro(null)
                          setAlvo({ item, acao: 'excluir' })
                        }}
                        aria-label="Excluir variável"
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ResponsiveTable>
        {!isLoading && (data?.length ?? 0) === 0 && (
          <EmptyState
            title="Nenhuma variável"
            description="Cadastre a consulta SQL do indicador. Depois ela aparece no cadastro da meta."
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/indicadores/nova')}>
                Nova variável
              </Button>
            }
          />
        )}
      </Paper>
      <Dialog open={Boolean(alvo)} onClose={() => !acao.isPending && setAlvo(null)}>
        <DialogTitle>
          {alvo?.acao === 'excluir' ? 'Excluir variável?' : alvo?.acao === 'inativar' ? 'Inativar variável?' : 'Reativar variável?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {alvo?.acao === 'excluir'
              ? `“${alvo.item.nome}” será removida.`
              : alvo?.acao === 'inativar'
                ? `“${alvo?.item.nome}” some do cadastro de metas, mas o histórico permanece.`
                : `“${alvo?.item.nome}” volta a ficar disponível se a consulta já foi testada.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlvo(null)} disabled={acao.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={alvo?.acao === 'excluir' ? 'error' : 'primary'}
            disabled={acao.isPending}
            onClick={() => alvo && acao.mutate(alvo)}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  )
}
