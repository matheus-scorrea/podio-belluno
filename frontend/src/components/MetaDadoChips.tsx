import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import LinearScaleOutlinedIcon from '@mui/icons-material/LinearScaleOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined'
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import SportsScoreOutlinedIcon from '@mui/icons-material/SportsScoreOutlined'
import { Chip, Tooltip } from '@mui/material'
import { alvoLabel, chartLabel, formatBonus } from '../lib/labels'
import { chipBonusSx, chipFilledSx, chipOutlinedSx } from '../theme/chips'

function iconeTipo(tipo: string) {
  switch (tipo) {
    case 'gauge':
      return <SpeedOutlinedIcon />
    case 'progress_bar':
      return <LinearScaleOutlinedIcon />
    case 'line':
      return <ShowChartOutlinedIcon />
    case 'column':
      return <BarChartOutlinedIcon />
    case 'marco':
      return <FlagOutlinedIcon />
    case 'comissao':
      return <PercentOutlinedIcon />
    default:
      return <SpeedOutlinedIcon />
  }
}

function iconeAlvo(tipo: string) {
  if (tipo === 'marco') {
    return <FlagOutlinedIcon />
  }
  if (tipo === 'comissao') {
    return <PercentOutlinedIcon />
  }
  return <SportsScoreOutlinedIcon />
}

export function TipoIndicadorChip({ tipo }: { tipo: string }) {
  return (
    <Chip size="small" variant="outlined" icon={iconeTipo(tipo)} label={chartLabel(tipo)} sx={chipOutlinedSx} />
  )
}

export function AlvoChip({
  tipo,
  valor,
  unidade,
}: {
  tipo: string
  valor: number | string | null | undefined
  unidade?: string | null
}) {
  const label = alvoLabel(tipo, valor, unidade)
  const chip = (
    <Chip
      size="small"
      icon={iconeAlvo(tipo)}
      label={label}
      sx={{ ...chipFilledSx, maxWidth: 180 }}
    />
  )

  return label.length > 22 ? <Tooltip title={label}>{chip}</Tooltip> : chip
}

export function BonusChip({
  valor,
  label,
}: {
  valor: number | string | null | undefined
  label?: string
}) {
  const n = Number(valor ?? 0)
  return (
    <Chip
      size="small"
      icon={<PaymentsOutlinedIcon />}
      label={label ?? formatBonus(valor)}
      sx={label || n > 0 ? chipBonusSx : { ...chipFilledSx, color: 'text.secondary' }}
    />
  )
}
