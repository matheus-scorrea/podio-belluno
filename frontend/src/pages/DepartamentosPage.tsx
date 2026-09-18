import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Button,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { hideColXs, ResponsiveTable } from '../components/ResponsiveTable'
import { AppShell } from '../layout/AppShell'
import type { Departamento } from '../types'

export function DepartamentosPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['departamentos'],
    queryFn: async () => (await api.get('/departamentos')).data as Departamento[],
  })

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell ano={2026} mes={9}>
      <PageHeader
        title="Setores"
        subtitle="Estrutura da empresa: setores, cargos e quem lidera cada área."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/departamentos/novo')}>
            Novo setor
          </Button>
        }
      />
      <Paper sx={{ overflow: 'hidden' }}>
        <ResponsiveTable>
          <TableHead>
            <TableRow>
              <TableCell>Setor</TableCell>
              <TableCell>Cargos</TableCell>
              <TableCell sx={hideColXs}>Cargo líder</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={`sk-${idx}`}>
                    <TableCell colSpan={5}>
                      <Skeleton height={36} />
                    </TableCell>
                  </TableRow>
                ))}
              {(data ?? []).map((d) => (
                <TableRow key={d.id} hover sx={{ opacity: d.ativo ? 1 : 0.7 }}>
                  <TableCell sx={{ fontWeight: 600 }}>{d.nome}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {(d.cargos ?? []).length === 0 && '—'}
                      {(d.cargos ?? []).map((c) => (
                        <Chip
                          key={c.id}
                          size="small"
                          label={c.nome}
                          variant={c.ativo ? 'outlined' : 'filled'}
                          sx={c.ativo ? undefined : { opacity: 0.7 }}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell sx={hideColXs}>{d.cargo_lider?.nome ?? '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={d.ativo ? 'Ativo' : 'Inativo'} color={d.ativo ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Editar">
                      <IconButton color="primary" onClick={() => navigate(`/departamentos/${d.id}/editar`)} aria-label="Editar setor">
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </ResponsiveTable>
        {!isLoading && (data?.length ?? 0) === 0 && (
          <EmptyState
            title="Nenhum setor cadastrado"
            description="Cadastre o primeiro setor e os cargos que ele usa."
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/departamentos/novo')}>
                Novo setor
              </Button>
            }
          />
        )}
      </Paper>
    </AppShell>
  )
}
