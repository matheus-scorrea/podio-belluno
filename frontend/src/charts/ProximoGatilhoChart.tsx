import { Box, LinearProgress, Stack, Typography } from '@mui/material'
import { BonusChip } from '../components/MetaDadoChips'
import { formatReais } from '../lib/comissao'
import { formatBonus } from '../lib/labels'
import type { ComissaoVendedor, DashboardMeta, EscadaFaixa, NivelComissao, NivelFaixa } from '../types'

export function ProximoGatilhoChart({ meta }: { meta: DashboardMeta }) {
  if (meta.chart.tipo === 'comissao') {
    return <ProximoComissao meta={meta} />
  }

  return <ProximoFaixa meta={meta} />
}

function ProximoComissao({ meta }: { meta: DashboardMeta }) {
  const niveis = meta.comissao?.niveis ?? []
  const vendedores = meta.comissao?.vendedores ?? []
  if (niveis.length === 0) {
    return null
  }

  const pessoas = vendedores.length > 0 ? vendedores : [vendedorVazio(niveis)]

  return (
    <Stack spacing={2} sx={{ mt: 1.5 }}>
      {pessoas.map((vendedor) => {
        const alvo = alvoDaComissao(niveis, vendedor)
        if (!alvo.nivel) {
          return null
        }
        const premio = alvo.concluido ? vendedor.premio || alvo.nivel.premio : alvo.nivel.premio

        return (
          <Stack key={String(vendedor.usuario_id ?? vendedor.nome)} spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Box>
                {pessoas.length > 1 && (
                  <Typography variant="subtitle2">{vendedor.nome}</Typography>
                )}
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {alvo.concluido ? `${alvo.nivel.nome} concluída` : `Próximo: ${alvo.nivel.nome}`}
                </Typography>
              </Box>
              <BonusChip valor={premio} />
            </Stack>
            <Barra
              label="Receita"
              atual={formatReais(vendedor.venda)}
              piso={formatReais(alvo.nivel.venda_min)}
              percentual={percentual(vendedor.venda, alvo.nivel.venda_min)}
              falta={alvo.concluido ? undefined : faltaReais(vendedor.venda, alvo.nivel.venda_min, 'de receita')}
              cor={meta.chart.cor}
            />
            <Barra
              label="Adesão"
              atual={formatReais(vendedor.adesao)}
              piso={formatReais(alvo.nivel.adesao_min)}
              percentual={percentual(vendedor.adesao, alvo.nivel.adesao_min)}
              falta={alvo.concluido ? undefined : faltaReais(vendedor.adesao, alvo.nivel.adesao_min, 'de adesão')}
              cor={meta.chart.cor}
            />
          </Stack>
        )
      })}
    </Stack>
  )
}

function ProximoFaixa({ meta }: { meta: DashboardMeta }) {
  const blocos = blocosDaFaixa(meta)
  if (blocos.length === 0) {
    return null
  }

  return (
    <Stack spacing={2} sx={{ mt: 1.5 }}>
      {blocos.map((bloco) => {
        const alvo = alvoDaFaixa(bloco.escada)
        if (!alvo.faixa) {
          return null
        }

        return (
          <Stack key={bloco.nome ?? alvo.faixa.nome} spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Box>
                {blocos.length > 1 && bloco.nome && (
                  <Typography variant="subtitle2">{bloco.nome}</Typography>
                )}
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {alvo.concluido ? `${alvo.faixa.nome} concluída` : `Próximo: ${alvo.faixa.nome}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatBonus(alvo.faixa.valor_por_unidade)}/un
                </Typography>
              </Box>
              <BonusChip valor={bloco.escada.bonus} />
            </Stack>
            <Barra
              label="Quantidade"
              atual={`${bloco.realizado} ${meta.unidade}`}
              piso={`${alvo.faixa.quantidade_min} ${meta.unidade}`}
              percentual={alvo.concluido ? 100 : percentual(bloco.realizado, alvo.faixa.quantidade_min)}
              falta={alvo.concluido || bloco.escada.falta == null || bloco.escada.falta <= 0 ? undefined : `faltam ${bloco.escada.falta} ${meta.unidade}`}
              cor={meta.chart.cor}
            />
          </Stack>
        )
      })}
    </Stack>
  )
}

function Barra({
  label,
  atual,
  piso,
  percentual: valor,
  falta,
  cor,
}: {
  label: string
  atual: string
  piso: string
  percentual: number
  falta?: string
  cor: string
}) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {atual} / {piso}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(Math.max(valor, 0), 100)}
        sx={{
          height: 10,
          borderRadius: 99,
          backgroundColor: '#E2E8F0',
          '& .MuiLinearProgress-bar': { backgroundColor: cor, borderRadius: 99 },
        }}
      />
      {falta && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {falta}
        </Typography>
      )}
    </Box>
  )
}

function alvoDaComissao(niveis: NivelComissao[], vendedor: ComissaoVendedor): { nivel: NivelComissao | undefined; concluido: boolean } {
  const atual = niveis.findIndex((nivel) => nivel.nome === vendedor.nivel)
  if (atual < 0) {
    return { nivel: niveis[0], concluido: false }
  }
  if (atual >= niveis.length - 1) {
    return { nivel: niveis[atual], concluido: true }
  }

  return { nivel: niveis[atual + 1], concluido: false }
}

function alvoDaFaixa(escada: EscadaFaixa): { faixa: NivelFaixa | undefined; concluido: boolean } {
  if (escada.proxima_faixa) {
    return { faixa: escada.faixas.find((faixa) => faixa.nome === escada.proxima_faixa), concluido: false }
  }
  if (escada.faixa_atual) {
    return { faixa: escada.faixas.find((faixa) => faixa.nome === escada.faixa_atual), concluido: true }
  }

  return { faixa: escada.faixas[0], concluido: false }
}

function blocosDaFaixa(meta: DashboardMeta): { nome: string | null; realizado: number; escada: EscadaFaixa }[] {
  const pessoas = (meta.series ?? []).filter((serie) => serie.usuario_alvo_id != null && serie.escada)
  if (pessoas.length > 1 && !meta.escada) {
    return pessoas.map((pessoa) => ({
      nome: pessoa.label,
      realizado: pessoa.valor,
      escada: pessoa.escada as EscadaFaixa,
    }))
  }

  const unica = pessoas.length === 1 ? pessoas[0] : null
  const escada = unica?.escada ?? meta.escada ?? pessoas[0]?.escada
  if (!escada) {
    return []
  }

  return [{ nome: unica?.label ?? null, realizado: unica ? unica.valor : meta.valor_realizado, escada }]
}

function vendedorVazio(niveis: NivelComissao[]): ComissaoVendedor {
  return {
    usuario_id: null,
    nome: 'Ainda sem lançamento',
    nivel: null,
    venda: 0,
    adesao: 0,
    percentual: 0,
    comissao: 0,
    premio: niveis[0]?.premio ?? 0,
    total: niveis[0]?.premio ?? 0,
  }
}

function percentual(valor: number, piso: number): number {
  if (piso <= 0) {
    return valor > 0 ? 100 : 0
  }

  return Math.min(100, (valor / piso) * 100)
}

function faltaReais(valor: number, piso: number, complemento: string): string | undefined {
  if (valor + 0.00001 >= piso) {
    return undefined
  }

  return `faltam ${formatReais(piso - valor)} ${complemento}`
}
