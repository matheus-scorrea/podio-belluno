import AddIcon from '@mui/icons-material/Add'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
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
import { AppShell } from '../layout/AppShell'
import type { AuthUser } from '../types'

type AcaoUsuario = 'inativar' | 'ativar' | 'excluir'

function erroApi(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
  return data?.errors?.usuario?.[0] ?? data?.message ?? 'Não foi possível concluir a ação.'
}

export function UsuariosPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [alvo, setAlvo] = useState<{ usuario: AuthUser; acao: AcaoUsuario } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get('/usuarios')).data.data as AuthUser[],
  })

  const mutation = useMutation({
    mutationFn: async ({ usuario, acao }: { usuario: AuthUser; acao: AcaoUsuario }) => {
      if (acao === 'excluir') {
        await api.delete(`/usuarios/${usuario.id}`)
        return
      }
      await api.put(`/usuarios/${usuario.id}`, { ativo: acao === 'ativar' })
    },
    onSuccess: async () => {
      setAlvo(null)
      setErro(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
        queryClient.invalidateQueries({ queryKey: ['usuario'] }),
      ])
    },
    onError: (err) => setErro(erroApi(err)),
  })

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell ano={2026} mes={9}>
      <PageHeader
        title="Usuários"
        subtitle="Contas da Direção, líderes e colaboradores."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/usuarios/novo')}>
            Novo usuário
          </Button>
        }
      />
      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Perfil</TableCell>
                <TableCell>Setor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={`sk-${idx}`}>
                    <TableCell colSpan={6}>
                      <Skeleton height={36} />
                    </TableCell>
                  </TableRow>
                ))}
              {(data ?? []).map((u) => {
                const proprio = u.id === user?.id
                return (
                  <TableRow key={u.id} hover sx={{ opacity: u.ativo ? 1 : 0.7 }}>
                    <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Chip size="small" label={u.perfil_label} />
                    </TableCell>
                    <TableCell>{u.departamento?.nome ?? '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={u.ativo ? 'Ativo' : 'Inativo'} color={u.ativo ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Editar">
                        <IconButton color="primary" onClick={() => navigate(`/usuarios/${u.id}/editar`)} aria-label="Editar usuário">
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={proprio ? 'Você não pode inativar a própria conta' : u.ativo ? 'Inativar' : 'Reativar'}>
                        <span>
                          <IconButton
                            color={u.ativo ? 'warning' : 'success'}
                            disabled={proprio}
                            onClick={() => {
                              setErro(null)
                              setAlvo({ usuario: u, acao: u.ativo ? 'inativar' : 'ativar' })
                            }}
                            aria-label={u.ativo ? 'Inativar usuário' : 'Reativar usuário'}
                          >
                            {u.ativo ? <BlockOutlinedIcon fontSize="small" /> : <CheckCircleOutlinedIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={proprio ? 'Você não pode excluir a própria conta' : 'Excluir'}>
                        <span>
                          <IconButton
                            color="error"
                            disabled={proprio}
                            onClick={() => {
                              setErro(null)
                              setAlvo({ usuario: u, acao: 'excluir' })
                            }}
                            aria-label="Excluir usuário"
                          >
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {!isLoading && (data?.length ?? 0) === 0 && (
          <EmptyState
            title="Nenhum usuário"
            description="Cadastre a equipe para atribuir metas e lançamentos."
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/usuarios/novo')}>
                Novo usuário
              </Button>
            }
          />
        )}
      </Paper>
      <Dialog open={Boolean(alvo)} onClose={() => !mutation.isPending && setAlvo(null)}>
        <DialogTitle>
          {alvo?.acao === 'excluir' ? 'Excluir usuário?' : alvo?.acao === 'inativar' ? 'Inativar usuário?' : 'Reativar usuário?'}
        </DialogTitle>
        <DialogContent>
          {alvo?.acao === 'excluir' && (
            <Typography>
              “{alvo.usuario.name}” será removido do sistema. Se essa pessoa já criou metas ou lançou progresso, inative a
              conta para preservar o histórico.
            </Typography>
          )}
          {alvo?.acao === 'inativar' && (
            <Typography>
              “{alvo.usuario.name}” não poderá entrar no sistema enquanto estiver inativo. O histórico de metas e
              lançamentos permanece.
            </Typography>
          )}
          {alvo?.acao === 'ativar' && (
            <Typography>“{alvo.usuario.name}” volta a poder entrar e aparecer nas atribuições.</Typography>
          )}
          {erro && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {erro}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlvo(null)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            color={alvo?.acao === 'ativar' ? 'primary' : 'error'}
            variant="contained"
            disabled={!alvo || mutation.isPending}
            onClick={() => alvo && mutation.mutate(alvo)}
          >
            {alvo?.acao === 'excluir' ? 'Excluir' : alvo?.acao === 'inativar' ? 'Inativar' : 'Reativar'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  )
}
