import ArrowBackIcon from '@mui/icons-material/ArrowBack'
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
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { AppShell } from '../layout/AppShell'
import { competenciaVigente } from '../lib/labels'
import type { DwAcesso, DwConexao, DwSshAuth, DwVpnTipo } from '../types'

function erroApi(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
  const errors = data?.errors ?? {}
  return (
    errors.conexao?.[0] ??
    errors.host?.[0] ??
    errors.ssh_host?.[0] ??
    errors.ssh_chave_privada?.[0] ??
    errors.vpn_config?.[0] ??
    errors.vpn_servidor?.[0] ??
    errors.vpn_psk?.[0] ??
    errors.vpn_senha?.[0] ??
    errors.senha?.[0] ??
    data?.message ??
    'Não foi possível salvar a conexão.'
  )
}

export function ConexaoFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const vigente = competenciaVigente()

  const [nome, setNome] = useState('')
  const [driver, setDriver] = useState('mysql')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('3306')
  const [database, setDatabase] = useState('')
  const [username, setUsername] = useState('')
  const [senha, setSenha] = useState('')
  const [ssl, setSsl] = useState(false)
  const [acesso, setAcesso] = useState<DwAcesso>('direto')
  const [sshHost, setSshHost] = useState('')
  const [sshPort, setSshPort] = useState('22')
  const [sshUsername, setSshUsername] = useState('')
  const [sshAuth, setSshAuth] = useState<DwSshAuth>('chave')
  const [sshSenha, setSshSenha] = useState('')
  const [sshChave, setSshChave] = useState('')
  const [sshPassphrase, setSshPassphrase] = useState('')
  const [vpnTipo, setVpnTipo] = useState<DwVpnTipo>('openvpn')
  const [vpnConfig, setVpnConfig] = useState('')
  const [vpnServidor, setVpnServidor] = useState('')
  const [vpnPsk, setVpnPsk] = useState('')
  const [vpnUsername, setVpnUsername] = useState('')
  const [vpnSenha, setVpnSenha] = useState('')
  const [temSenha, setTemSenha] = useState(false)
  const [temSshChave, setTemSshChave] = useState(false)
  const [temSshSenha, setTemSshSenha] = useState(false)
  const [temVpnConfig, setTemVpnConfig] = useState(false)
  const [temVpnPsk, setTemVpnPsk] = useState(false)
  const [temVpnSenha, setTemVpnSenha] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(!isEdit)

  const { data, isLoading } = useQuery({
    queryKey: ['conexao', id],
    queryFn: async () => (await api.get(`/conexoes/${id}`)).data as DwConexao,
    enabled: isEdit,
  })

  useEffect(() => {
    if (!data) {
      return
    }
    setNome(data.nome)
    setDriver(data.driver)
    setHost(data.host)
    setPort(String(data.port))
    setDatabase(data.database)
    setUsername(data.username)
    setSsl(data.ssl)
    setAcesso(data.acesso ?? 'direto')
    setSshHost(data.ssh_host ?? '')
    setSshPort(String(data.ssh_port ?? 22))
    setSshUsername(data.ssh_username ?? '')
    setSshAuth(data.ssh_auth ?? 'chave')
    setVpnTipo(data.vpn_tipo ?? 'openvpn')
    setVpnServidor(data.vpn_servidor ?? '')
    setVpnUsername(data.vpn_username ?? '')
    setTemSenha(data.tem_senha)
    setTemSshChave(Boolean(data.tem_ssh_chave))
    setTemSshSenha(Boolean(data.tem_ssh_senha))
    setTemVpnConfig(Boolean(data.tem_vpn_config))
    setTemVpnPsk(Boolean(data.tem_vpn_psk))
    setTemVpnSenha(Boolean(data.tem_vpn_senha))
    setSenha('')
    setSshSenha('')
    setSshChave('')
    setSshPassphrase('')
    setVpnConfig('')
    setVpnPsk('')
    setVpnSenha('')
    setHydrated(true)
  }, [data])

  function payload(incluirSegredos: boolean) {
    return {
      nome,
      driver,
      host,
      port: Number(port),
      database,
      username,
      ssl,
      acesso,
      ssh_host: acesso === 'ssh' ? sshHost : null,
      ssh_port: acesso === 'ssh' ? Number(sshPort) : null,
      ssh_username: acesso === 'ssh' ? sshUsername : null,
      ssh_auth: acesso === 'ssh' ? sshAuth : null,
      vpn_tipo: acesso === 'vpn' ? vpnTipo : null,
      vpn_servidor: acesso === 'vpn' && vpnTipo === 'l2tp' ? vpnServidor : null,
      vpn_username: acesso === 'vpn' ? vpnUsername : null,
      ...(incluirSegredos && senha !== '' ? { senha } : {}),
      ...(incluirSegredos && sshSenha !== '' ? { ssh_senha: sshSenha } : {}),
      ...(incluirSegredos && sshChave !== '' ? { ssh_chave_privada: sshChave } : {}),
      ...(incluirSegredos && sshPassphrase !== '' ? { ssh_passphrase: sshPassphrase } : {}),
      ...(incluirSegredos && vpnConfig !== '' ? { vpn_config: vpnConfig } : {}),
      ...(incluirSegredos && vpnPsk !== '' ? { vpn_psk: vpnPsk } : {}),
      ...(incluirSegredos && vpnSenha !== '' ? { vpn_senha: vpnSenha } : {}),
    }
  }

  const testar = useMutation({
    mutationFn: async () => {
      const corpo = payload(true)
      if (isEdit && id) {
        await api.post(`/conexoes/${id}/testar`, corpo)
        return
      }
      await api.post('/conexoes/testar', corpo)
    },
    onSuccess: () => {
      setError(null)
      setOk('Conexão bem-sucedida.')
    },
    onError: (err) => {
      setOk(null)
      setError(erroApi(err))
    },
  })

  const salvar = useMutation({
    mutationFn: async () => {
      if (isEdit && id) {
        await api.put(`/conexoes/${id}`, payload(true))
        return
      }
      await api.post('/conexoes', { ...payload(true), senha })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['conexoes'] })
      navigate('/indicadores/conexoes')
    },
    onError: (err) => setError(erroApi(err)),
  })

  if (user && !user.is_direcao) {
    return <Navigate to="/" replace />
  }

  const senhaBancoOk = senha !== '' || (isEdit && temSenha)
  const sshOk =
    acesso !== 'ssh' ||
    (sshHost !== '' &&
      sshUsername !== '' &&
      (sshAuth === 'chave' ? sshChave !== '' || (isEdit && temSshChave) : sshSenha !== '' || (isEdit && temSshSenha)))
  const vpnOk =
    acesso !== 'vpn' ||
    (vpnTipo === 'l2tp'
      ? vpnServidor !== '' &&
        vpnUsername !== '' &&
        (vpnPsk !== '' || (isEdit && temVpnPsk)) &&
        (vpnSenha !== '' || (isEdit && temVpnSenha))
      : vpnConfig !== '' || (isEdit && temVpnConfig))
  const podeTestar = host !== '' && database !== '' && username !== '' && senhaBancoOk && sshOk && vpnOk
  const podeSalvar = nome !== '' && podeTestar

  return (
    <AppShell ano={vigente.ano} mes={vigente.mes}>
      <PageHeader
        title={isEdit ? 'Editar conexão' : 'Nova conexão'}
        subtitle="Direto, túnel SSH ou VPN. Segredos nunca voltam na API depois de salvos."
        backTo={{ href: '/indicadores/conexoes', label: 'Voltar para conexões' }}
      />
      <Paper sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 640 }}>
        {isEdit && (!hydrated || isLoading) ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            <TextField label="Nome da conexão" value={nome} onChange={(e) => setNome(e.target.value)} required helperText="Ex.: Data warehouse Belluno" />
            <FormControl>
              <InputLabel>Driver</InputLabel>
              <Select label="Driver" value={driver} onChange={(e) => setDriver(String(e.target.value))}>
                <MenuItem value="mysql">MySQL</MenuItem>
              </Select>
            </FormControl>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Como chegar no banco
              </Typography>
              <RadioGroup value={acesso} onChange={(e) => setAcesso(e.target.value as DwAcesso)}>
                <FormControlLabel value="direto" control={<Radio />} label="Direto (host alcançável pela rede do Pódio)" />
                <FormControlLabel value="ssh" control={<Radio />} label="Túnel SSH (jump / bastion)" />
                <FormControlLabel value="vpn" control={<Radio />} label="Túnel VPN (OpenVPN, WireGuard ou L2TP)" />
              </RadioGroup>
            </Box>
            {acesso === 'ssh' && (
              <Stack spacing={2} sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  O host do MySQL é o endereço visto a partir do servidor SSH — muitas vezes 127.0.0.1.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="Host SSH" value={sshHost} onChange={(e) => setSshHost(e.target.value)} required sx={{ flex: 2 }} />
                  <TextField label="Porta SSH" type="number" value={sshPort} onChange={(e) => setSshPort(e.target.value)} required sx={{ flex: 1 }} />
                </Stack>
                <TextField label="Usuário SSH" value={sshUsername} onChange={(e) => setSshUsername(e.target.value)} required autoComplete="off" />
                <FormControl>
                  <InputLabel>Autenticação SSH</InputLabel>
                  <Select label="Autenticação SSH" value={sshAuth} onChange={(e) => setSshAuth(e.target.value as DwSshAuth)}>
                    <MenuItem value="chave">Chave privada</MenuItem>
                    <MenuItem value="senha">Senha</MenuItem>
                  </Select>
                </FormControl>
                {sshAuth === 'chave' ? (
                  <>
                    <TextField
                      label={isEdit && temSshChave ? 'Chave privada (em branco mantém a atual)' : 'Chave privada'}
                      value={sshChave}
                      onChange={(e) => setSshChave(e.target.value)}
                      multiline
                      minRows={4}
                      required={!isEdit || !temSshChave}
                      autoComplete="off"
                    />
                    <TextField
                      label="Passphrase da chave (se houver)"
                      type="password"
                      value={sshPassphrase}
                      onChange={(e) => setSshPassphrase(e.target.value)}
                      autoComplete="new-password"
                    />
                  </>
                ) : (
                  <TextField
                    label={isEdit && temSshSenha ? 'Senha SSH (em branco mantém a atual)' : 'Senha SSH'}
                    type="password"
                    value={sshSenha}
                    onChange={(e) => setSshSenha(e.target.value)}
                    required={!isEdit || !temSshSenha}
                    autoComplete="new-password"
                  />
                )}
              </Stack>
            )}
            {acesso === 'vpn' && (
              <Stack spacing={2} sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Só a rota do host do MySQL entra na VPN. O Postgres do Pódio continua fora do túnel. Sem scripts PostUp/up.
                </Typography>
                <FormControl>
                  <InputLabel>Tipo de VPN</InputLabel>
                  <Select label="Tipo de VPN" value={vpnTipo} onChange={(e) => setVpnTipo(e.target.value as DwVpnTipo)}>
                    <MenuItem value="openvpn">OpenVPN (.ovpn)</MenuItem>
                    <MenuItem value="wireguard">WireGuard</MenuItem>
                    <MenuItem value="l2tp">L2TP/IPsec (PSK)</MenuItem>
                  </Select>
                </FormControl>
                {vpnTipo === 'l2tp' ? (
                  <>
                    <TextField
                      label="Servidor L2TP"
                      value={vpnServidor}
                      onChange={(e) => setVpnServidor(e.target.value)}
                      required
                      placeholder="vpn.empresa.com ou IP"
                      autoComplete="off"
                    />
                    <TextField
                      label={isEdit && temVpnPsk ? 'PSK (em branco mantém a atual)' : 'Chave pré-compartilhada (PSK)'}
                      type="password"
                      value={vpnPsk}
                      onChange={(e) => setVpnPsk(e.target.value)}
                      required={!isEdit || !temVpnPsk}
                      autoComplete="new-password"
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Usuário L2TP"
                        value={vpnUsername}
                        onChange={(e) => setVpnUsername(e.target.value)}
                        required
                        sx={{ flex: 1 }}
                        autoComplete="off"
                      />
                      <TextField
                        label={isEdit && temVpnSenha ? 'Senha L2TP (em branco mantém a atual)' : 'Senha L2TP'}
                        type="password"
                        value={vpnSenha}
                        onChange={(e) => setVpnSenha(e.target.value)}
                        required={!isEdit || !temVpnSenha}
                        sx={{ flex: 1 }}
                        autoComplete="new-password"
                      />
                    </Stack>
                  </>
                ) : (
                  <>
                    <TextField
                      label={
                        isEdit && temVpnConfig
                          ? vpnTipo === 'wireguard'
                            ? 'Config WireGuard (em branco mantém a atual)'
                            : 'Arquivo .ovpn (em branco mantém a atual)'
                          : vpnTipo === 'wireguard'
                            ? 'Config WireGuard'
                            : 'Arquivo .ovpn'
                      }
                      value={vpnConfig}
                      onChange={(e) => setVpnConfig(e.target.value)}
                      multiline
                      minRows={6}
                      required={!isEdit || !temVpnConfig}
                      autoComplete="off"
                    />
                    {vpnTipo === 'openvpn' && (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField label="Usuário VPN (se o .ovpn pedir)" value={vpnUsername} onChange={(e) => setVpnUsername(e.target.value)} sx={{ flex: 1 }} autoComplete="off" />
                        <TextField label="Senha VPN" type="password" value={vpnSenha} onChange={(e) => setVpnSenha(e.target.value)} sx={{ flex: 1 }} autoComplete="new-password" />
                      </Stack>
                    )}
                  </>
                )}
              </Stack>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Host do MySQL"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                required
                sx={{ flex: 2 }}
                placeholder={acesso === 'ssh' ? '127.0.0.1' : 'hostname ou IP'}
                helperText={acesso === 'direto' ? 'Hostname ou IP alcançável pelo servidor do Pódio.' : undefined}
              />
              <TextField label="Porta" type="number" value={port} onChange={(e) => setPort(e.target.value)} required sx={{ flex: 1 }} />
            </Stack>
            <TextField label="Banco" value={database} onChange={(e) => setDatabase(e.target.value)} required />
            <TextField label="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="off" />
            <TextField
              label={isEdit ? 'Senha do banco (em branco mantém a atual)' : 'Senha do banco'}
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required={!isEdit}
              autoComplete="new-password"
            />
            <FormControlLabel control={<Checkbox checked={ssl} onChange={(e) => setSsl(e.target.checked)} />} label="Usar SSL no MySQL" />
            {ok && <Alert severity="success">{ok}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/indicadores/conexoes')}>
                Cancelar
              </Button>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="outlined" onClick={() => testar.mutate()} disabled={!podeTestar || testar.isPending}>
                  Testar conexão
                </Button>
                <Button variant="contained" onClick={() => salvar.mutate()} disabled={!podeSalvar || salvar.isPending}>
                  Salvar
                </Button>
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Senha do banco, chave SSH, PSK e configuração da VPN são cifradas com a chave da aplicação e ficam só no Postgres do Pódio.
            </Typography>
          </Stack>
        )}
      </Paper>
    </AppShell>
  )
}
