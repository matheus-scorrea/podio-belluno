import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Button,
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
import type { DwConexao } from '../types'

function erroApi(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
  return data?.errors?.conexao?.[0] ?? data?.message ?? 'Não foi possível concluir a ação.'
}

export function ConexoesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { ano, mes } = competenciaVigente()
  const [alvo, setAlvo] = useState<DwConexao | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['conexoes'],
    queryFn: async () => (await api.get('/conexoes')).data.data as DwConexao[],
  })

  const excluir = useMutation({
    mutationFn: async (item: DwConexao) => {
      await api.delete(`/conexoes/${item.id}`)
    },
    onSuccess: async () => {
      setAlvo(null)
      setErro(null)
      await queryClient.invalidateQueries({ queryKey: ['conexoes'] })
    },
    onError: (err) => setErro(erroApi(err)),
  })

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell ano={ano} mes={mes}>
      <PageHeader
        title="Conexões"
        subtitle="Credenciais do data warehouse ficam cifradas no banco do Pódio — nunca no repositório git."
        backTo={{ href: '/indicadores', label: 'Voltar para indicadores' }}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/indicadores/conexoes/nova')}>
            Nova conexão
          </Button>
        }
      />
      {erro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}
      <Paper sx={{ overflow: 'hidden' }}>
        <ResponsiveTable>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Acesso</TableCell>
              <TableCell>Driver</TableCell>
              <TableCell sx={hideColXs}>Host</TableCell>
              <TableCell>Banco</TableCell>
              <TableCell sx={hideColXs}>Usuário</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, idx) => (
                <TableRow key={`sk-${idx}`}>
                  <TableCell colSpan={7}>
                    <Skeleton height={36} />
                  </TableCell>
                </TableRow>
              ))}
            {(data ?? []).map((item) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.nome}</TableCell>
                <TableCell>
                  {item.acesso === 'ssh'
                    ? 'SSH'
                    : item.acesso === 'vpn'
                      ? item.vpn_tipo === 'l2tp'
                        ? 'VPN L2TP'
                        : item.vpn_tipo === 'wireguard'
                          ? 'VPN WireGuard'
                          : 'VPN OpenVPN'
                      : 'Direto'}
                </TableCell>
                <TableCell>{item.driver}</TableCell>
                <TableCell sx={hideColXs}>
                  {item.host}:{item.port}
                </TableCell>
                <TableCell>{item.database}</TableCell>
                <TableCell sx={hideColXs}>{item.username}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="Editar">
                    <IconButton color="primary" onClick={() => navigate(`/indicadores/conexoes/${item.id}/editar`)} aria-label="Editar conexão">
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={(item.variaveis_count ?? 0) > 0 ? 'Em uso por uma variável' : 'Excluir'}>
                    <span>
                      <IconButton
                        color="error"
                        disabled={(item.variaveis_count ?? 0) > 0}
                        onClick={() => {
                          setErro(null)
                          setAlvo(item)
                        }}
                        aria-label="Excluir conexão"
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
            title="Nenhuma conexão"
            description="Cadastre o MySQL do data warehouse para as variáveis rodarem as consultas."
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/indicadores/conexoes/nova')}>
                Nova conexão
              </Button>
            }
          />
        )}
      </Paper>
      <Dialog open={Boolean(alvo)} onClose={() => !excluir.isPending && setAlvo(null)}>
        <DialogTitle>Excluir conexão?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">“{alvo?.nome}” será removida. A senha cifrada some junto.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlvo(null)} disabled={excluir.isPending}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" disabled={excluir.isPending} onClick={() => alvo && excluir.mutate(alvo)}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  )
}
