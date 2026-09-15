import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { ConviteAcessoDialog } from '../components/ConviteAcessoDialog'
import { PageHeader } from '../components/PageHeader'
import { AppShell } from '../layout/AppShell'
import { cargosDoSetor, departamentosParaSelect } from '../lib/organizacao'
import type { AuthUser, ConviteAcesso, Departamento } from '../types'

type ConviteDialogo = ConviteAcesso & { nome: string }

export function UsuarioFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isDirecao, setIsDirecao] = useState(false)
  const [ativo, setAtivo] = useState(true)
  const [departamentoId, setDepartamentoId] = useState<number | ''>('')
  const [cargoId, setCargoId] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(!isEdit)
  const [convite, setConvite] = useState<ConviteDialogo | null>(null)

  const { data: usuario, isLoading } = useQuery({
    queryKey: ['usuario', id],
    queryFn: async () => (await api.get(`/usuarios/${id}`)).data.data as AuthUser,
    enabled: isEdit,
  })
  const { data: departamentos } = useQuery({
    queryKey: ['departamentos'],
    queryFn: async () => (await api.get('/departamentos')).data as Departamento[],
  })
  const cargos = cargosDoSetor(departamentos, departamentoId, cargoId === '' ? null : cargoId)
  const setores = departamentosParaSelect(departamentos, departamentoId === '' ? null : departamentoId)

  useEffect(() => {
    if (!usuario) {
      return
    }
    setName(usuario.name)
    setEmail(usuario.email)
    setIsDirecao(usuario.is_direcao)
    setAtivo(usuario.ativo)
    setDepartamentoId(usuario.departamento_id ?? '')
    setCargoId(usuario.cargo_id ?? '')
    setHydrated(true)
  }, [usuario])

  const podeSalvar = Boolean(name && email) && (isDirecao || (Boolean(departamentoId) && Boolean(cargoId)))
  const proprio = Boolean(id) && Number(id) === user?.id

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name,
        email,
        is_direcao: isDirecao,
        ativo,
        departamento_id: isDirecao ? null : departamentoId || null,
        cargo_id: isDirecao ? null : cargoId || null,
      }
      if (isEdit && id) {
        await api.put(`/usuarios/${id}`, payload)
        return null
      }
      const { data } = await api.post('/usuarios', payload)
      return {
        senha_temporaria: data.senha_temporaria as string,
        mensagem: data.mensagem as string,
        nome: name,
      }
    },
    onSuccess: async (gerado) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
        queryClient.invalidateQueries({ queryKey: ['usuario'] }),
      ])
      if (gerado) {
        setConvite(gerado)
        return
      }
      navigate('/usuarios')
    },
    onError: () => setError('Não foi possível salvar o usuário. Verifique os campos obrigatórios.'),
  })

  const conviteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/usuarios/${id}/senha-temporaria`)
      return {
        senha_temporaria: data.senha_temporaria as string,
        mensagem: data.mensagem as string,
        nome: name || usuario?.name || '',
      }
    },
    onSuccess: async (gerado) => {
      setError(null)
      setConvite(gerado)
      await queryClient.invalidateQueries({ queryKey: ['usuario', id] })
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: () => setError('Não foi possível gerar uma nova senha temporária.'),
  })

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell ano={2026} mes={9}>
      <PageHeader
        title={isEdit ? 'Editar usuário' : 'Novo usuário'}
        subtitle={
          isEdit
            ? 'Atualize perfil, setor e acesso desta pessoa.'
            : 'Cadastre a pessoa. Geramos uma senha temporária e um texto para você enviar no chat.'
        }
        backTo={{ href: '/usuarios', label: 'Voltar para usuários' }}
      />
      <Paper sx={{ p: { xs: 2, md: 3.5 } }}>
        {isEdit && (!hydrated || isLoading) ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Stack spacing={2.5} sx={{ maxWidth: 640 }}>
              <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <FormControlLabel
                control={<Checkbox checked={isDirecao} onChange={(e) => setIsDirecao(e.target.checked)} />}
                label="Direção"
              />
              {isEdit && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={ativo}
                      onChange={(e) => setAtivo(e.target.checked)}
                      disabled={proprio}
                    />
                  }
                  label="Usuário ativo"
                />
              )}
              {!isDirecao && (
                <>
                  <FormControl>
                    <InputLabel>Setor</InputLabel>
                    <Select
                      label="Setor"
                      value={departamentoId}
                      onChange={(e) => {
                        const value: unknown = e.target.value
                        setDepartamentoId(value === '' ? '' : Number(value))
                        setCargoId('')
                      }}
                    >
                      <MenuItem value="" disabled>
                        Selecione
                      </MenuItem>
                      {(setores ?? []).map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <InputLabel>Cargo</InputLabel>
                    <Select
                      label="Cargo"
                      value={cargoId}
                      disabled={!departamentoId}
                      onChange={(e) => {
                        const value: unknown = e.target.value
                        setCargoId(value === '' ? '' : Number(value))
                      }}
                    >
                      <MenuItem value="" disabled>
                        Selecione
                      </MenuItem>
                      {cargos.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.nome}
                          {!c.ativo ? ' (inativo)' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )}
            </Stack>
            {error && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}
            <Divider sx={{ mt: 4, mb: 2.5 }} />
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
            >
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/usuarios')}>
                Voltar para usuários
              </Button>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                {isEdit && (
                  <Button
                    variant="outlined"
                    startIcon={<ChatOutlinedIcon />}
                    disabled={proprio || conviteMutation.isPending}
                    onClick={() => conviteMutation.mutate()}
                  >
                    Gerar senha e texto do chat
                  </Button>
                )}
                <Button variant="contained" onClick={() => mutation.mutate()} disabled={!podeSalvar || mutation.isPending}>
                  {isEdit ? 'Salvar alterações' : 'Cadastrar e gerar acesso'}
                </Button>
              </Stack>
            </Stack>
          </>
        )}
      </Paper>
      <ConviteAcessoDialog
        open={Boolean(convite)}
        nome={convite?.nome}
        senha={convite?.senha_temporaria ?? ''}
        mensagem={convite?.mensagem ?? ''}
        onClose={() => {
          const veioDoCadastro = !isEdit
          setConvite(null)
          if (veioDoCadastro) {
            navigate('/usuarios')
          }
        }}
      />
    </AppShell>
  )
}
