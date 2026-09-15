import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { copiarTexto } from '../lib/copiar'

type Props = {
  open: boolean
  nome?: string
  senha: string
  mensagem: string
  onClose: () => void
}

export function ConviteAcessoDialog({ open, nome, senha, mensagem, onClose }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null)

  async function copiar(texto: string, ok: string) {
    const copiou = await copiarTexto(texto)
    setFeedback(copiou ? ok : 'Não foi possível copiar. Selecione o texto e copie manualmente.')
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Texto para enviar no chat</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography color="text.secondary">
            {nome
              ? `Envie este recado para ${nome}. No primeiro acesso a pessoa cria a senha definitiva.`
              : 'Envie este recado no chat. No primeiro acesso a pessoa cria a senha definitiva.'}
          </Typography>
          <TextField label="Senha temporária" value={senha} slotProps={{ input: { readOnly: true } }} />
          <TextField label="Mensagem" value={mensagem} multiline minRows={8} slotProps={{ input: { readOnly: true } }} />
          {feedback && <Alert severity={feedback.startsWith('Não') ? 'warning' : 'success'}>{feedback}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button startIcon={<ContentCopyOutlinedIcon />} onClick={() => void copiar(senha, 'Senha copiada.')}>
          Copiar senha
        </Button>
        <Button
          variant="contained"
          startIcon={<ContentCopyOutlinedIcon />}
          onClick={() => void copiar(mensagem, 'Texto copiado. Cole no chat.')}
        >
          Copiar texto do chat
        </Button>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
