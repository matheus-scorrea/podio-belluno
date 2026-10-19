import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { EscadaDegraus, type DegrauEscada } from '../components/EscadaDegraus'
import { formatReais } from '../lib/comissao'
import type { ComissaoVendedor, DashboardMeta, NivelComissao } from '../types'

export function ComissaoMetaChart({ meta }: { meta: DashboardMeta }) {
  const vendedores = meta.comissao?.vendedores ?? []
  const niveis = meta.comissao?.niveis ?? []
  const unico = vendedores.length === 1 ? vendedores[0] : null

  return (
    <Stack spacing={1.5} sx={{ mt: 1.5 }}>
      <EscadaDegraus degraus={degrausDaComissao(niveis, unico)} />
      {vendedores.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Ainda não há receita e adesão lançadas nesta competência.
        </Typography>
      ) : unico ? (
        <PainelUnico meta={meta} unico={unico} />
      ) : (
        <TabelaVendedores vendedores={vendedores} />
      )}
    </Stack>
  )
}

function degrausDaComissao(niveis: NivelComissao[], unico: ComissaoVendedor | null): DegrauEscada[] {
  const atual = niveis.findIndex((nivel) => nivel.nome === unico?.nivel)
  return niveis.map((nivel, indice) => {
    const detalhe = `prêmio ${formatReais(nivel.premio)} · ${formatReais(nivel.venda_min)} · adesão ${formatReais(nivel.adesao_min)}`
    if (!unico) {
      return { nome: nivel.nome, detalhe, estado: 'referencia' as const }
    }
    if (indice === atual) {
      return { nome: nivel.nome, detalhe, estado: 'atual' as const }
    }
    if (atual >= 0 && indice < atual) {
      return { nome: nivel.nome, detalhe, estado: 'feito' as const }
    }
    const proximo = atual < 0 ? indice === 0 : indice === atual + 1
    if (proximo) {
      return { nome: nivel.nome, detalhe, estado: 'proximo' as const, falta: faltaDoGatilho(nivel, unico) }
    }
    return { nome: nivel.nome, detalhe, estado: 'futuro' as const }
  })
}

function faltaDoGatilho(nivel: NivelComissao, unico: ComissaoVendedor): string | undefined {
  const partes: string[] = []
  if (unico.venda + 0.00001 < nivel.venda_min) {
    partes.push(`faltam ${formatReais(nivel.venda_min - unico.venda)} de receita`)
  }
  if (unico.adesao + 0.00001 < nivel.adesao_min) {
    partes.push(`faltam ${formatReais(nivel.adesao_min - unico.adesao)} de adesão`)
  }
  return partes.length > 0 ? partes.join(' · ') : undefined
}

function PainelUnico({ meta, unico }: { meta: DashboardMeta; unico: ComissaoVendedor }) {
  const premio = unico.nivel ? unico.premio : Number(meta.comissao?.niveis?.[0]?.premio ?? 0)
  const total = unico.nivel ? unico.total : premio
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{unico.nome}</Typography>
      <Chip
        size="small"
        label={unico.nivel ?? 'Nenhuma faixa atingida'}
        sx={{ alignSelf: 'flex-start', bgcolor: unico.nivel ? '#10B98122' : '#E2E8F0', color: unico.nivel ? '#047857' : 'text.secondary' }}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        <Dado label="Comissão" valor={formatReais(unico.comissao)} />
        <Dado label="Prêmio" valor={formatReais(premio)} />
        <Dado label="Receita" valor={formatReais(unico.venda)} />
        <Dado label="Adesão" valor={formatReais(unico.adesao)} />
      </Box>
      <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums', color: meta.chart.cor }}>
        {formatReais(total)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Remuneração variável (comissão + prêmio)
      </Typography>
    </Stack>
  )
}

function TabelaVendedores({ vendedores }: { vendedores: ComissaoVendedor[] }) {
  return (
    <Table size="small">
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
