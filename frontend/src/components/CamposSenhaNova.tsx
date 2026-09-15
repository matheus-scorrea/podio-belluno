import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { IconButton, InputAdornment, TextField } from '@mui/material'
import { useState } from 'react'
import { SENHA_REQUISITOS } from '../lib/senha'

type Props = {
  senha: string
  confirmacao: string
  onSenha: (value: string) => void
  onConfirmacao: (value: string) => void
  label?: string
}

export function CamposSenhaNova({ senha, confirmacao, onSenha, onConfirmacao, label = 'Nova senha' }: Props) {
  const [mostrar, setMostrar] = useState(false)
  const divergem = confirmacao.length > 0 && senha !== confirmacao

  return (
    <>
      <TextField
        label={label}
        type={mostrar ? 'text' : 'password'}
        value={senha}
        onChange={(e) => onSenha(e.target.value)}
        required
        autoComplete="new-password"
        helperText={SENHA_REQUISITOS}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setMostrar((atual) => !atual)}
                  edge="end"
                >
                  {mostrar ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField
        label="Confirmar senha"
        type={mostrar ? 'text' : 'password'}
        value={confirmacao}
        onChange={(e) => onConfirmacao(e.target.value)}
        required
        autoComplete="new-password"
        error={divergem}
        helperText={divergem ? 'As senhas não coincidem.' : undefined}
      />
    </>
  )
}
