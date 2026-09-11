import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { formatReais } from '../lib/comissao'
import type { DashboardMeta } from '../types'

export function ComissaoMetaChart({ meta }: { meta: DashboardMeta }) {
  const vendedores = meta.comissao?.vendedores ?? []
  const unico = vendedores.length === 1 ? vendedores[0] : null

  if (vendedores.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Ainda não há receita e adesão lançadas nesta competência.
      </Typography>
    )
  }

  if (unico) {
    return (
      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        <Typography variant="subtitle2">{unico.nome}</Typography>
        <Chip
          size="small"
          label={unico.nivel ?? 'Nenhuma faixa atingida'}
          sx={{ alignSelf: 'flex-start', bgcolor: unico.nivel ? '#10B98122' : '#E2E8F0', color: unico.nivel ? '#047857' : 'text.secondary' }}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
          <Dado label="Comissão" valor={formatReais(unico.comissao)} />
          <Dado label="Prêmio" valor={formatReais(unico.premio)} />
          <Dado label="Receita" valor={formatReais(unico.venda)} />
          <Dado label="Adesão" valor={formatReais(unico.adesao)} />
        </Box>
        <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums', color: meta.chart.cor }}>
          {formatReais(unico.total)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Remuneração variável (comissão + prêmio)
        </Typography>
      </Stack>
    )
  }

  return (
    <Table size="small" sx={{ mt: 1.5 }}>
      <TableHead>
        <TableRow>
          <TableCell>Vendedor</TableCell>
          <TableCell>Meta</TableCell>
          <TableCell align="right">Comissão</TableCell>
          <TableCell align="right">Prêmio</TableCell>
          <TableCell align="right">Total</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {vendedores.map((v) => (
          <TableRow key={String(v.usuario_id)}>
            <TableCell>{v.nome}</TableCell>
            <TableCell>{v.nivel ?? '—'}</TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatReais(v.comissao)}
            </TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatReais(v.premio)}
            </TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {formatReais(v.total)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Dado({ label, valor }: { label: string; valor: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
        {valor}
      </Typography>
    </Box>
  )
}
