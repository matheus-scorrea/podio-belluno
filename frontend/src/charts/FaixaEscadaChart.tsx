import { Stack, Typography } from '@mui/material'
import { EscadaDegraus, type DegrauEscada } from '../components/EscadaDegraus'
import { BonusChip } from '../components/MetaDadoChips'
import { formatBonus } from '../lib/labels'
import type { DashboardMeta, EscadaFaixa } from '../types'

export function FaixaEscadaChart({ meta }: { meta: DashboardMeta }) {
  const pessoas = (meta.series ?? []).filter((serie) => serie.usuario_alvo_id != null && serie.escada)
  const unica = pessoas.length === 1 ? pessoas[0] : null
  const escada = unica?.escada ?? meta.escada ?? pessoas[0]?.escada
  const destacar = Boolean(meta.escada) || Boolean(unica)
  const realizado = unica ? unica.valor : meta.valor_realizado

  if (!escada) {
    return null
  }

  return (
    <Stack spacing={1.5} sx={{ mt: 1.5 }}>
      {destacar && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums', color: meta.chart.cor, lineHeight: 1 }}>
            {realizado}
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.75 }}>
              {meta.unidade}
            </Typography>
          </Typography>
          <BonusChip valor={escada.bonus} />
        </Stack>
      )}
      <EscadaDegraus degraus={degrausDaFaixa(escada, destacar)} />
    </Stack>
  )
}

function degrausDaFaixa(escada: EscadaFaixa, destacar: boolean): DegrauEscada[] {
  return escada.faixas.map((faixa) => {
    const detalhe = `${formatBonus(faixa.valor_por_unidade)}/un · a partir de ${faixa.quantidade_min}`
    if (!destacar) {
      return { nome: faixa.nome, detalhe, estado: 'referencia' }
    }
    if (faixa.nome === escada.faixa_atual) {
      return { nome: faixa.nome, detalhe, estado: 'atual' }
    }
    if (faixa.nome === escada.proxima_faixa) {
      const falta = escada.falta != null && escada.falta > 0 ? `faltam ${escada.falta}` : undefined
      return { nome: faixa.nome, detalhe, estado: 'proximo', falta }
    }
    const atual = escada.faixas.find((item) => item.nome === escada.faixa_atual)
    const feito = atual != null && faixa.quantidade_min < atual.quantidade_min
    return { nome: faixa.nome, detalhe, estado: feito ? 'feito' : 'futuro' }
  })
}
